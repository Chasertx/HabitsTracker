namespace HabitsTracker.Api.Models;

public class ListItem
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}
