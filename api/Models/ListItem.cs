using System.ComponentModel.DataAnnotations.Schema;

namespace HabitsTracker.Api.Models;

public class ListItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>Consecutive days done, ending today (or yesterday, if today isn't done yet).</summary>
    [NotMapped] public int CurrentStreak { get; set; }
    /// <summary>Longest run of consecutive days ever done.</summary>
    [NotMapped] public int BestStreak { get; set; }
}
