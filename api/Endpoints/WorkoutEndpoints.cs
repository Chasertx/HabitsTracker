using HabitsTracker.Api.Data;
using HabitsTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Endpoints;

public static class WorkoutEndpoints
{
    public record NameRequest(string? Name);
    public record WorkoutSummary(int Id, string Name, int ExerciseCount, DateTime CreatedAt);
    public record ExerciseSummary(int Id, int WorkoutId, string Name, int SortOrder, int SetCount);
    public record WorkoutDetail(int Id, string Name, DateTime CreatedAt, List<ExerciseSummary> Exercises);

    private const int MaxNameLength = 100;

    public static void MapWorkoutEndpoints(this IEndpointRouteBuilder app)
    {
        var workouts = app.MapGroup("/api/workouts");

        workouts.MapGet("/", async (AppDbContext db) =>
            await db.Workouts
                .OrderBy(w => w.CreatedAt)
                .Select(w => new WorkoutSummary(w.Id, w.Name, w.Exercises.Count, w.CreatedAt))
                .ToListAsync());

        workouts.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var workout = await db.Workouts
                .Where(w => w.Id == id)
                .Select(w => new WorkoutDetail(w.Id, w.Name, w.CreatedAt,
                    w.Exercises
                        .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                        .Select(x => new ExerciseSummary(x.Id, x.WorkoutId, x.Name, x.SortOrder, x.Sets.Count))
                        .ToList()))
                .FirstOrDefaultAsync();
            return workout is null ? Results.NotFound() : Results.Ok(workout);
        });

        workouts.MapPost("/", async (NameRequest request, AppDbContext db) =>
        {
            if (Validate(request.Name) is { } error) return error;

            var workout = new Workout { Name = request.Name!.Trim(), CreatedAt = DateTime.UtcNow };
            db.Workouts.Add(workout);
            await db.SaveChangesAsync();
            return Results.Created($"/api/workouts/{workout.Id}",
                new WorkoutSummary(workout.Id, workout.Name, 0, workout.CreatedAt));
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
            // Exercises are removed by the cascade delete on the foreign key.
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
                new ExerciseSummary(exercise.Id, id, exercise.Name, exercise.SortOrder, 0));
        });

        workouts.MapDelete("/{id:int}/exercises/{exerciseId:int}", async (int id, int exerciseId, AppDbContext db) =>
        {
            var deleted = await db.Exercises
                .Where(x => x.Id == exerciseId && x.WorkoutId == id)
                .ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });
    }

    internal static IResult? Validate(string? name)
    {
        var trimmed = name?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return Validation.Problem("name", "Name is required.");
        if (trimmed.Length > MaxNameLength)
            return Validation.Problem("name", $"Name must be {MaxNameLength} characters or fewer.");
        return null;
    }
}
