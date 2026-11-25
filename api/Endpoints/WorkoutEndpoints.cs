using HabitsTracker.Api.Data;
using HabitsTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Endpoints;

public static class WorkoutEndpoints
{
    public record NameRequest(string? Name);
    public record WorkoutSummary(
        int Id, string Name, int ExerciseCount, int SetCount, DateTime CreatedAt, DateTime? ActiveSessionStartedAt,
        DateTime? ActiveSessionPausedAt);
    public record ExerciseSummary(int Id, int WorkoutId, string Name, int SortOrder, int SetCount, int CompletedSetCount);
    /// <summary>
    /// ActiveSessionPausedSeconds is the paused time so far, not counting a pause in progress
    /// (ActiveSessionPausedAt); elapsed = (pausedAt or now) - startedAt - pausedSeconds.
    /// </summary>
    public record WorkoutDetail(
        int Id, string Name, DateTime CreatedAt, DateTime? ActiveSessionStartedAt, DateTime? ActiveSessionPausedAt,
        double ActiveSessionPausedSeconds, List<ExerciseSummary> Exercises);

    private const int MaxNameLength = 100;

    public static void MapWorkoutEndpoints(this IEndpointRouteBuilder app)
    {
        var workouts = app.MapGroup("/api/workouts");

        workouts.MapGet("/", async (AppDbContext db) =>
            await db.Workouts
                .OrderBy(w => w.CreatedAt)
                .Select(w => new WorkoutSummary(
                    w.Id, w.Name, w.Exercises.Count, w.Exercises.SelectMany(x => x.Sets).Count(), w.CreatedAt,
                    w.ActiveSessionStartedAt, w.ActiveSessionPausedAt))
                .ToListAsync());

        workouts.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var workout = await LoadDetail(db, id);
            return workout is null ? Results.NotFound() : Results.Ok(workout);
        });

        workouts.MapPost("/", async (NameRequest request, AppDbContext db) =>
        {
            if (Validate(request.Name) is { } error) return error;

            var workout = new Workout { Name = request.Name!.Trim(), CreatedAt = DateTime.UtcNow };
            db.Workouts.Add(workout);
            await db.SaveChangesAsync();
            return Results.Created($"/api/workouts/{workout.Id}",
                new WorkoutSummary(workout.Id, workout.Name, 0, 0, workout.CreatedAt, null, null));
        });

        workouts.MapPatch("/{id:int}", async (int id, NameRequest request, AppDbContext db) =>
        {
            if (Validate(request.Name) is { } error) return error;

            var workout = await db.Workouts.FindAsync(id);
            if (workout is null) return Results.NotFound();

            workout.Name = request.Name!.Trim();
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        workouts.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            // Exercises and sets cascade; history sessions keep their snapshot and are unlinked.
            var deleted = await db.Workouts.Where(w => w.Id == id).ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });

        workouts.MapPost("/{id:int}/exercises", async (int id, NameRequest request, AppDbContext db) =>
        {
            if (Validate(request.Name) is { } error) return error;
            if (!await db.Workouts.AnyAsync(w => w.Id == id)) return Results.NotFound();

            var nextOrder = (await db.Exercises.Where(x => x.WorkoutId == id)
                .MaxAsync(x => (int?)x.SortOrder) ?? -1) + 1;
            var exercise = new Exercise
            {
                WorkoutId = id,
                Name = request.Name!.Trim(),
                SortOrder = nextOrder,
                CreatedAt = DateTime.UtcNow,
            };
            db.Exercises.Add(exercise);
            await db.SaveChangesAsync();
            return Results.Created($"/api/exercises/{exercise.Id}",
                new ExerciseSummary(exercise.Id, id, exercise.Name, exercise.SortOrder, 0, 0));
        });

        workouts.MapDelete("/{id:int}/exercises/{exerciseId:int}", async (int id, int exerciseId, AppDbContext db) =>
        {
            var deleted = await db.Exercises
                .Where(x => x.Id == exerciseId && x.WorkoutId == id)
                .ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });

        // --- Sessions: start → (check off sets) → finish (logged to history) or cancel ---

        // Starts a session with every set unchecked. Starting an already-running workout is a no-op.
        workouts.MapPost("/{id:int}/start", async (int id, AppDbContext db) =>
        {
            var workout = await db.Workouts.FindAsync(id);
            if (workout is null) return Results.NotFound();

            if (workout.ActiveSessionStartedAt is null)
            {
                var hasSets = await db.Sets.AnyAsync(s => db.Exercises.Any(x => x.Id == s.ExerciseId && x.WorkoutId == id));
                if (!hasSets) return Results.Conflict(new { error = "Add an exercise with at least one set first." });

                await ClearCompletedSets(db, id);
                workout.ActiveSessionStartedAt = DateTime.UtcNow;
                ResetPause(workout);
                await db.SaveChangesAsync();
            }
            return Results.Ok(await LoadDetail(db, id));
        });

        // Stops the clock on the running session. Pausing a paused session is a no-op.
        workouts.MapPost("/{id:int}/pause", async (int id, AppDbContext db) =>
        {
            var workout = await db.Workouts.FindAsync(id);
            if (workout is null) return Results.NotFound();
            if (workout.ActiveSessionStartedAt is null)
                return Results.Conflict(new { error = "This workout hasn't been started." });

            workout.ActiveSessionPausedAt ??= DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(await LoadDetail(db, id));
        });

        // Restarts the clock after a pause.
        workouts.MapPost("/{id:int}/resume", async (int id, AppDbContext db) =>
        {
            var workout = await db.Workouts.FindAsync(id);
            if (workout is null) return Results.NotFound();

            EndPause(workout, DateTime.UtcNow);
            await db.SaveChangesAsync();
            return Results.Ok(await LoadDetail(db, id));
        });

        // Saves the running session (with what was checked off) to history, then resets the workout.
        workouts.MapPost("/{id:int}/finish", async (int id, AppDbContext db) =>
        {
            var workout = await db.Workouts
                .Include(w => w.Exercises).ThenInclude(x => x.Sets)
                .FirstOrDefaultAsync(w => w.Id == id);
            if (workout is null) return Results.NotFound();
            if (workout.ActiveSessionStartedAt is null)
                return Results.Conflict(new { error = "This workout hasn't been started." });

            var session = FinishSession(db, workout);
            await db.SaveChangesAsync();
            return Results.Ok(new { sessionId = session.Id });
        });

        // Abandons the running session without logging it.
        workouts.MapPost("/{id:int}/cancel", async (int id, AppDbContext db) =>
        {
            var workout = await db.Workouts.FindAsync(id);
            if (workout is null) return Results.NotFound();

            await ClearCompletedSets(db, id);
            workout.ActiveSessionStartedAt = null;
            ResetPause(workout);
            await db.SaveChangesAsync();
            return Results.Ok(await LoadDetail(db, id));
        });
    }

    /// <summary>
    /// Logs the running session of a workout (loaded with its exercises and sets) to history
    /// and resets the workout. The caller saves changes.
    /// </summary>
    internal static WorkoutSession FinishSession(AppDbContext db, Workout workout)
    {
            var now = DateTime.UtcNow;
            var startedAt = workout.ActiveSessionStartedAt!.Value;
            EndPause(workout, now);

            var session = new WorkoutSession
            {
                WorkoutId = workout.Id,
                WorkoutName = workout.Name,
                StartedAt = startedAt,
                FinishedAt = now,
                DurationSeconds = Math.Max(0, (now - startedAt).TotalSeconds - workout.ActiveSessionPausedSeconds),
                Exercises = workout.Exercises
                    .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                    .Select((x, i) => new SessionExercise
                    {
                        Name = x.Name,
                        SortOrder = i,
                        Sets = x.Sets
                            .OrderBy(s => s.SortOrder).ThenBy(s => s.Id)
                            .Select((s, j) => new SessionSet
                            {
                                Reps = s.Reps,
                                Weight = s.Weight,
                                IsCompleted = s.IsCompleted,
                                SortOrder = j,
                            })
                            .ToList(),
                    })
                    .ToList(),
            };
            db.Sessions.Add(session);

            workout.ActiveSessionStartedAt = null;
            ResetPause(workout);
            foreach (var set in workout.Exercises.SelectMany(x => x.Sets)) set.IsCompleted = false;
            return session;
    }

    private static void EndPause(Workout workout, DateTime now)
    {
        if (workout.ActiveSessionPausedAt is not DateTime pausedAt) return;
        workout.ActiveSessionPausedSeconds += Math.Max(0, (now - pausedAt).TotalSeconds);
        workout.ActiveSessionPausedAt = null;
    }

    private static void ResetPause(Workout workout)
    {
        workout.ActiveSessionPausedAt = null;
        workout.ActiveSessionPausedSeconds = 0;
    }

    private static Task<WorkoutDetail?> LoadDetail(AppDbContext db, int id) =>
        db.Workouts
            .Where(w => w.Id == id)
            .Select(w => new WorkoutDetail(w.Id, w.Name, w.CreatedAt, w.ActiveSessionStartedAt, w.ActiveSessionPausedAt,
                w.ActiveSessionPausedSeconds,
                w.Exercises
                    .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                    .Select(x => new ExerciseSummary(
                        x.Id, x.WorkoutId, x.Name, x.SortOrder, x.Sets.Count, x.Sets.Count(s => s.IsCompleted)))
                    .ToList()))
            .FirstOrDefaultAsync();

    private static Task ClearCompletedSets(AppDbContext db, int workoutId) =>
        db.Sets
            .Where(s => s.IsCompleted && db.Exercises.Any(x => x.Id == s.ExerciseId && x.WorkoutId == workoutId))
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.IsCompleted, false));

    internal static IResult? Validate(string? name)
    {
        var trimmed = name?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return Validation.Problem("name", "Name is required.");
        if (trimmed.Length > MaxNameLength)
            return Validation.Problem("name", $"Name must be {MaxNameLength} characters or fewer.");
        return null;
    }
}
