namespace HabitsTracker.Api.Models;

/// <summary>
/// A finished workout in the history. It is a snapshot: later edits to the workout's
/// exercises or sets don't change it, and it survives the workout being deleted.
/// </summary>
public class WorkoutSession
{
    public int Id { get; set; }
    /// <summary>The workout it came from; null once that workout is deleted.</summary>
    public int? WorkoutId { get; set; }
    public required string WorkoutName { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime FinishedAt { get; set; }
    public List<SessionExercise> Exercises { get; set; } = [];
}

public class SessionExercise
{
    public int Id { get; set; }
    public int SessionId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
    public List<SessionSet> Sets { get; set; } = [];
}

public class SessionSet
{
    public int Id { get; set; }
    public int SessionExerciseId { get; set; }
    public int Reps { get; set; }
    public double Weight { get; set; }
    public bool IsCompleted { get; set; }
    public int SortOrder { get; set; }
}
