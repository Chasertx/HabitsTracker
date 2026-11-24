using HabitsTracker.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Services;

/// <summary>
/// Puts checked-off items back on the list once midnight has passed in the user's time zone.
/// Runs whenever the list is read, so a reset is never missed even if the server was
/// offline at midnight.
/// </summary>
public static class DailyReset
{
    public static async Task RunAsync(AppDbContext db, string? timeZoneId)
    {
        var startOfTodayUtc = StartOfTodayUtc(ResolveTimeZone(timeZoneId));

        var expired = await db.Items
            .Where(i => i.IsCompleted && i.CompletedAt < startOfTodayUtc)
            .OrderBy(i => i.SortOrder)
            .ToListAsync();
        if (expired.Count == 0) return;

        // Titles already open on the list; resetting a completed copy would create a duplicate.
        var openTitles = (await db.Items.Where(i => !i.IsCompleted).Select(i => i.Title).ToListAsync())
            .Select(Normalize)
            .ToHashSet();

        foreach (var item in expired)
        {
            if (openTitles.Add(Normalize(item.Title)))
            {
                item.IsCompleted = false;
                item.CompletedAt = null;
            }
            else
            {
                db.Items.Remove(item);
            }
        }

        await db.SaveChangesAsync();
    }

    private static string Normalize(string title) => title.Trim().ToUpperInvariant();

    private static TimeZoneInfo ResolveTimeZone(string? id)
    {
        if (!string.IsNullOrWhiteSpace(id) && TimeZoneInfo.TryFindSystemTimeZoneById(id, out var tz))
            return tz;
        return TimeZoneInfo.Local;
    }

    private static DateTime StartOfTodayUtc(TimeZoneInfo tz)
    {
        var localToday = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).Date;
        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localToday, DateTimeKind.Unspecified), tz);
    }
}
