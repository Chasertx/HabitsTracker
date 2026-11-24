using HabitsTracker.Api.Data;
using HabitsTracker.Api.Models;
using HabitsTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Endpoints;

public static class ItemEndpoints
{
    public record CreateItemRequest(string? Title);
    public record UpdateItemRequest(string? Title, bool? IsCompleted);
    public record ReorderRequest(int[] Ids);

    public static void MapItemEndpoints(this IEndpointRouteBuilder app)
    {
        var items = app.MapGroup("/api/items");

        // timeZone is an IANA id (e.g. "America/Chicago") used to decide when midnight has passed.
        items.MapGet("/", async (string? timeZone, AppDbContext db) =>
        {
            await DailyReset.RunAsync(db, timeZone);
            return await db.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.Id).ToListAsync();
        });

        items.MapPost("/", async (CreateItemRequest request, AppDbContext db) =>
        {
            var title = request.Title?.Trim();
            if (string.IsNullOrEmpty(title))
                return Validation.Problem("title", "Title is required.");

            var nextOrder = (await db.Items.MaxAsync(i => (int?)i.SortOrder) ?? -1) + 1;
            var item = new ListItem { Title = title, SortOrder = nextOrder, CreatedAt = DateTime.UtcNow };
            db.Items.Add(item);
            await db.SaveChangesAsync();
            return Results.Created($"/api/items/{item.Id}", item);
        });

        items.MapPatch("/{id:int}", async (int id, UpdateItemRequest request, AppDbContext db) =>
        {
            var item = await db.Items.FindAsync(id);
            if (item is null) return Results.NotFound();

            if (request.Title is not null)
            {
                var title = request.Title.Trim();
                if (title.Length == 0) return Validation.Problem("title", "Title cannot be empty.");
                item.Title = title;
            }
            if (request.IsCompleted is bool done && done != item.IsCompleted)
            {
                item.IsCompleted = done;
                item.CompletedAt = done ? DateTime.UtcNow : null;
            }

            await db.SaveChangesAsync();
            return Results.Ok(item);
        });

        // Sets the list order to match the given ids; ids not listed keep their relative order after them.
        items.MapPut("/order", async (ReorderRequest request, AppDbContext db) =>
        {
            var position = request.Ids
                .Distinct()
                .Select((id, index) => (id, index))
                .ToDictionary(x => x.id, x => x.index);

            var all = await db.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.Id).ToListAsync();
            var ordered = all
                .OrderBy(i => position.TryGetValue(i.Id, out var p) ? p : int.MaxValue)
                .ToList();
            for (var i = 0; i < ordered.Count; i++) ordered[i].SortOrder = i;

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        items.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var deleted = await db.Items.Where(i => i.Id == id).ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });
    }
}
