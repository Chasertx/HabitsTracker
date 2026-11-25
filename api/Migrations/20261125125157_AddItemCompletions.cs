using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HabitsTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddItemCompletions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItemCompletions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ItemId = table.Column<int>(type: "integer", nullable: false),
                    Day = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemCompletions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemCompletions_Items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ItemCompletions_ItemId_Day",
                table: "ItemCompletions",
                columns: new[] { "ItemId", "Day" },
                unique: true);

            // Items already checked off count as done on the day they were checked (UTC).
            migrationBuilder.Sql(
                @"INSERT INTO ""ItemCompletions"" (""ItemId"", ""Day"")
                  SELECT ""Id"", (""CompletedAt"" AT TIME ZONE 'UTC')::date FROM ""Items""
                  WHERE ""IsCompleted"" AND ""CompletedAt"" IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItemCompletions");
        }
    }
}
