using HabitsTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<ListItem> Items => Set<ListItem>();
    public DbSet<Workout> Workouts => Set<Workout>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<ExerciseSet> Sets => Set<ExerciseSet>();

    // DateTime columns map to PostgreSQL "timestamp with time zone"; the app always writes UTC.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ListItem>(e =>
        {
            e.Property(i => i.Title).HasMaxLength(200);
            e.HasIndex(i => i.SortOrder);
        });

        modelBuilder.Entity<Workout>(e =>
        {
            e.Property(w => w.Name).HasMaxLength(100);
            e.HasMany(w => w.Exercises)
                .WithOne()
                .HasForeignKey(x => x.WorkoutId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Exercise>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.HasIndex(x => new { x.WorkoutId, x.SortOrder });
            e.HasMany(x => x.Sets)
                .WithOne()
                .HasForeignKey(s => s.ExerciseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExerciseSet>(e =>
        {
            e.ToTable("Sets");
            e.HasIndex(s => new { s.ExerciseId, s.SortOrder });
        });
    }
}
