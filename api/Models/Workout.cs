namespace HabitsTracker.Api.Models;

public class Workout
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>When the in-progress session began; null when the workout isn't running.</summary>
    public DateTime? ActiveSessionStartedAt { get; set; }
    /// <summary>When the running session was paused; null while it's running (or not started).</summary>
    public DateTime? ActiveSessionPausedAt { get; set; }
    /// <summary>Total seconds the running session has spent paused, not counting a pause in progress.</summary>
    public double ActiveSessionPausedSeconds { get; set; }
    public List<Exercise> Exercises { get; set; } = [];
}

public class Exercise
{
    public int Id { get; set; }
    public int WorkoutId { get; set; }
    public required string Name { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ExerciseSet> Sets { get; set; } = [];
}

public class ExerciseSet
{
    public int Id { get; set; }
    public int ExerciseId { get; set; }
    public int Reps { get; set; }
    /// <summary>Unitless; the app decides how to label it.</summary>
    public double Weight { get; set; }
    /// <summary>Checked off in the current session. Cleared when a session starts, finishes or is cancelled.</summary>
    public bool IsCompleted { get; set; }
    public int SortOrder { get; set; }
}
