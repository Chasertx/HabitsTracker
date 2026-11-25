namespace HabitsTracker.Api.Models;

/// <summary>A day (in the user's time zone) on which a routine item was checked off.</summary>
public class ItemCompletion
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public DateOnly Day { get; set; }
}
