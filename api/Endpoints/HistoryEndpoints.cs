using HabitsTracker.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Endpoints;

/// <summary>Finished workout sessions, newest first.</summary>
public static class HistoryEndpoints
{
    public record SessionSummary(
        int Id, int? WorkoutId, string WorkoutName, DateTime StartedAt, DateTime FinishedAt, double DurationSeconds,
        int ExerciseCount, int SetCount, int CompletedSetCount, double Volume);

    public record SessionSetDto(int Id, int Reps, double Weight, bool IsCompleted);
    public record SessionExerciseDto(int Id, string Name, List<SessionSetDto> Sets);
    public record SessionDetail(
        int Id, int? WorkoutId, string WorkoutName, DateTime StartedAt, DateTime FinishedAt, double DurationSeconds,
        List<SessionExerciseDto> Exercises);

    public static void MapHistoryEndpoints(this IEndpointRouteBuilder app)
    {
        var history = app.MapGroup("/api/history");

        // Volume = reps × weight summed over completed sets.
        history.MapGet("/", async (int? workoutId, AppDbContext db) =>
            await db.Sessions
                .Where(s => workoutId == null || s.WorkoutId == workoutId)
                .OrderByDescending(s => s.FinishedAt)
                .Select(s => new SessionSummary(
                    s.Id, s.WorkoutId, s.WorkoutName, s.StartedAt, s.FinishedAt, s.DurationSeconds,
                    s.Exercises.Count,
                    s.Exercises.SelectMany(x => x.Sets).Count(),
                    s.Exercises.SelectMany(x => x.Sets).Count(set => set.IsCompleted),
                    s.Exercises.SelectMany(x => x.Sets).Where(set => set.IsCompleted).Sum(set => set.Reps * set.Weight)))
                .ToListAsync());

        history.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var session = await db.Sessions
                .Where(s => s.Id == id)
                .Select(s => new SessionDetail(
                    s.Id, s.WorkoutId, s.WorkoutName, s.StartedAt, s.FinishedAt, s.DurationSeconds,
                    s.Exercises
                        .OrderBy(x => x.SortOrder)
                        .Select(x => new SessionExerciseDto(
                            x.Id,
                            x.Name,
                            x.Sets.OrderBy(set => set.SortOrder)
                                .Select(set => new SessionSetDto(set.Id, set.Reps, set.Weight, set.IsCompleted))
                                .ToList()))
                        .ToList()))
                .FirstOrDefaultAsync();
            return session is null ? Results.NotFound() : Results.Ok(session);
        });

        history.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var deleted = await db.Sessions.Where(s => s.Id == id).ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });
    }
}
