namespace HabitsTracker.Api.Models;

public class Workout
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; }
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
    public int SortOrder { get; set; }
}
