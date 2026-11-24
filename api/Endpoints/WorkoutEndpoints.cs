using HabitsTracker.Api.Data;
using HabitsTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Endpoints;

public static class WorkoutEndpoints
{
    public record NameRequest(string? Name);
    public record WorkoutSummary(int Id, string Name, int ExerciseCount, DateTime CreatedAt, DateTime? ActiveSessionStartedAt);
    public record ExerciseSummary(int Id, int WorkoutId, string Name, int SortOrder, int SetCount, int CompletedSetCount);
    public record WorkoutDetail(
        int Id, string Name, DateTime CreatedAt, DateTime? ActiveSessionStartedAt, List<ExerciseSummary> Exercises);

    private const int MaxNameLength = 100;

    public static void MapWorkoutEndpoints(this IEndpointRouteBuilder app)
    {
        var workouts = app.MapGroup("/api/workouts");

        workouts.MapGet("/", async (AppDbContext db) =>
            await db.Workouts
                .OrderBy(w => w.CreatedAt)
                .Select(w => new WorkoutSummary(w.Id, w.Name, w.Exercises.Count, w.CreatedAt, w.ActiveSessionStartedAt))
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
                new WorkoutSummary(workout.Id, workout.Name, 0, workout.CreatedAt, null));
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
                await ClearCompletedSets(db, id);
                workout.ActiveSessionStartedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
            return Results.Ok(await LoadDetail(db, id));
        });

        // Saves the running session (with what was checked off) to history, then resets the workout.
        workouts.MapPost("/{id:int}/finish", async (int id, AppDbContext db) =>
        {
            var workout = await db.Workouts
                .Include(w => w.Exercises).ThenInclude(x => x.Sets)
                .FirstOrDefaultAsync(w => w.Id == id);
            if (workout is null) return Results.NotFound();
            if (workout.ActiveSessionStartedAt is not DateTime startedAt)
                return Results.Conflict(new { error = "This workout hasn't been started." });

            var session = new WorkoutSession
            {
                WorkoutId = workout.Id,
                WorkoutName = workout.Name,
                StartedAt = startedAt,
                FinishedAt = DateTime.UtcNow,
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
            foreach (var set in workout.Exercises.SelectMany(x => x.Sets)) set.IsCompleted = false;

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
            await db.SaveChangesAsync();
            return Results.Ok(await LoadDetail(db, id));
        });
    }

    private static Task<WorkoutDetail?> LoadDetail(AppDbContext db, int id) =>
        db.Workouts
            .Where(w => w.Id == id)
            .Select(w => new WorkoutDetail(w.Id, w.Name, w.CreatedAt, w.ActiveSessionStartedAt,
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
