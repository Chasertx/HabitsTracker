using HabitsTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HabitsTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<ListItem> Items => Set<ListItem>();
    public DbSet<Workout> Workouts => Set<Workout>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<ExerciseSet> Sets => Set<ExerciseSet>();
    public DbSet<WorkoutSession> Sessions => Set<WorkoutSession>();
    public DbSet<SessionExercise> SessionExercises => Set<SessionExercise>();
    public DbSet<SessionSet> SessionSets => Set<SessionSet>();

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

        modelBuilder.Entity<WorkoutSession>(e =>
        {
            e.Property(s => s.WorkoutName).HasMaxLength(100);
            e.HasIndex(s => s.FinishedAt);
            // History outlives the workout: deleting a workout only unlinks its sessions.
            e.HasOne<Workout>()
                .WithMany()
                .HasForeignKey(s => s.WorkoutId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasMany(s => s.Exercises)
                .WithOne()
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SessionExercise>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100);
            e.HasMany(x => x.Sets)
                .WithOne()
                .HasForeignKey(s => s.SessionExerciseId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
