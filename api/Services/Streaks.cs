using HabitsTracker.Api.Data;
using HabitsTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Services;

/// <summary>Records the days each routine item is done and works out its streaks.</summary>
public static class Streaks
{
    public static DateOnly Today(string? timeZoneId) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, DailyReset.ResolveTimeZone(timeZoneId)));

    /// <summary>Marks (or unmarks) today as done for the item. Call before SaveChanges.</summary>
    public static async Task RecordAsync(AppDbContext db, int itemId, DateOnly today, bool done)
    {
        var existing = await db.ItemCompletions.FirstOrDefaultAsync(c => c.ItemId == itemId && c.Day == today);
        if (done && existing is null) db.ItemCompletions.Add(new ItemCompletion { ItemId = itemId, Day = today });
        if (!done && existing is not null) db.ItemCompletions.Remove(existing);
    }

    /// <summary>Fills in CurrentStreak and BestStreak on the given items.</summary>
    public static async Task FillAsync(AppDbContext db, IReadOnlyList<ListItem> items, DateOnly today)
    {
        var ids = items.Select(i => i.Id).ToList();
        var days = (await db.ItemCompletions.Where(c => ids.Contains(c.ItemId)).ToListAsync())
            .GroupBy(c => c.ItemId)
            .ToDictionary(g => g.Key, g => g.Select(c => c.Day).ToHashSet());

        foreach (var item in items)
        {
            if (!days.TryGetValue(item.Id, out var done)) continue;
            (item.CurrentStreak, item.BestStreak) = Compute(done, today);
        }
    }

    public static (int Current, int Best) Compute(IReadOnlySet<DateOnly> done, DateOnly today)
    {
        // A streak is still alive today until midnight, so count back from yesterday if today isn't done.
        var day = done.Contains(today) ? today : today.AddDays(-1);
        var current = 0;
        while (done.Contains(day)) { current++; day = day.AddDays(-1); }

        var best = 0;
        foreach (var d in done)
        {
            if (done.Contains(d.AddDays(-1))) continue; // only count from the start of each run
            var run = 0;
            for (var x = d; done.Contains(x); x = x.AddDays(1)) run++;
            best = Math.Max(best, run);
        }
        return (current, Math.Max(best, current));
    }
}
