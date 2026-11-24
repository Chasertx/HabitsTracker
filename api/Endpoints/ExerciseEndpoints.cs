using HabitsTracker.Api.Data;
using HabitsTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Endpoints;

public static class ExerciseEndpoints
{
    public record SetRequest(int? Reps, double? Weight);
    public record ExerciseDetail(int Id, int WorkoutId, string WorkoutName, string Name, List<ExerciseSet> Sets);

    private const int MaxReps = 1000;
    private const double MaxWeight = 10_000;

    public static void MapExerciseEndpoints(this IEndpointRouteBuilder app)
    {
        var exercises = app.MapGroup("/api/exercises");

        exercises.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var exercise = await db.Exercises
                .Where(x => x.Id == id)
                .Select(x => new ExerciseDetail(
                    x.Id,
                    x.WorkoutId,
                    db.Workouts.Where(w => w.Id == x.WorkoutId).Select(w => w.Name).First(),
                    x.Name,
                    x.Sets.OrderBy(s => s.SortOrder).ThenBy(s => s.Id).ToList()))
                .FirstOrDefaultAsync();
            return exercise is null ? Results.NotFound() : Results.Ok(exercise);
        });

        exercises.MapPatch("/{id:int}", async (int id, WorkoutEndpoints.NameRequest request, AppDbContext db) =>
        {
            if (WorkoutEndpoints.Validate(request.Name) is { } error) return error;

            var exercise = await db.Exercises.FindAsync(id);
            if (exercise is null) return Results.NotFound();

            exercise.Name = request.Name!.Trim();
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Values left out are copied from the exercise's last set, so "add set" repeats the previous one.
        exercises.MapPost("/{id:int}/sets", async (int id, SetRequest? request, AppDbContext db) =>
        {
            if (Validate(request?.Reps, request?.Weight) is { } error) return error;
            if (!await db.Exercises.AnyAsync(x => x.Id == id)) return Results.NotFound();

            var last = await db.Sets
                .Where(s => s.ExerciseId == id)
                .OrderByDescending(s => s.SortOrder).ThenByDescending(s => s.Id)
                .FirstOrDefaultAsync();

            var set = new ExerciseSet
            {
                ExerciseId = id,
                Reps = request?.Reps ?? last?.Reps ?? 0,
                Weight = request?.Weight ?? last?.Weight ?? 0,
                SortOrder = (last?.SortOrder ?? -1) + 1,
            };
            db.Sets.Add(set);
            await db.SaveChangesAsync();
            return Results.Created($"/api/sets/{set.Id}", set);
        });

        var sets = app.MapGroup("/api/sets");

        sets.MapPatch("/{id:int}", async (int id, SetRequest request, AppDbContext db) =>
        {
            if (Validate(request.Reps, request.Weight) is { } error) return error;

            var set = await db.Sets.FindAsync(id);
            if (set is null) return Results.NotFound();

            if (request.Reps is int reps) set.Reps = reps;
            if (request.Weight is double weight) set.Weight = weight;
            await db.SaveChangesAsync();
            return Results.Ok(set);
        });

        sets.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var deleted = await db.Sets.Where(s => s.Id == id).ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });
    }

    private static IResult? Validate(int? reps, double? weight)
    {
        if (reps is < 0 or > MaxReps)
            return Validation.Problem("reps", $"Reps must be between 0 and {MaxReps}.");
        if (weight is double w && (double.IsNaN(w) || w < 0 || w > MaxWeight))
            return Validation.Problem("weight", $"Weight must be between 0 and {MaxWeight}.");
        return null;
    }
}
