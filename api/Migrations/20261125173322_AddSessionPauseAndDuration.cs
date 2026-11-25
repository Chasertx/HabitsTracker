using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HabitsTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionPauseAndDuration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ActiveSessionPausedAt",
                table: "Workouts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "ActiveSessionPausedSeconds",
                table: "Workouts",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "DurationSeconds",
                table: "Sessions",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            // Sessions logged before pausing existed ran start to finish.
            migrationBuilder.Sql(
                @"UPDATE ""Sessions"" SET ""DurationSeconds"" = EXTRACT(EPOCH FROM (""FinishedAt"" - ""StartedAt""));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActiveSessionPausedAt",
                table: "Workouts");

            migrationBuilder.DropColumn(
                name: "ActiveSessionPausedSeconds",
                table: "Workouts");

            migrationBuilder.DropColumn(
                name: "DurationSeconds",
                table: "Sessions");
        }
    }
}
