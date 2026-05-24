using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Memoid.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MemeCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemeCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MemeTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ImagePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    MemeCategoryId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MemeTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MemeTemplates_MemeCategories_MemeCategoryId",
                        column: x => x.MemeCategoryId,
                        principalTable: "MemeCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GeneratedMemes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ImagePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SourceType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    MemeTemplateId = table.Column<int>(type: "integer", nullable: true),
                    OriginalImagePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TopText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    BottomText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TextPosition = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    FontFamily = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    FontSize = table.Column<int>(type: "integer", nullable: false),
                    TextColor = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    TextBackgroundColor = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    AppliedEffect = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    IsFavorite = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeneratedMemes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GeneratedMemes_MemeTemplates_MemeTemplateId",
                        column: x => x.MemeTemplateId,
                        principalTable: "MemeTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "MemeCategories",
                columns: new[] { "Id", "CreatedAt", "Description", "IsActive", "Name" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Класичні шаблони для мемів", true, "Класика" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Шаблони для реакцій та відповідей", true, "Реакції" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Меми про навчання, дедлайни та програмування", true, "Навчання" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Меми з тваринами", true, "Тварини" }
                });

            migrationBuilder.InsertData(
                table: "MemeTemplates",
                columns: new[] { "Id", "CreatedAt", "ImagePath", "IsActive", "MemeCategoryId", "Title" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "/uploads/templates/classic-template-1.png", true, 1, "Класичний шаблон" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "/uploads/templates/reaction-template-1.png", true, 2, "Реакція" },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "/uploads/templates/study-template-1.png", true, 3, "Навчальний мем" },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "/uploads/templates/animal-template-1.png", true, 4, "Мем з твариною" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedMemes_CreatedAt",
                table: "GeneratedMemes",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedMemes_IsFavorite",
                table: "GeneratedMemes",
                column: "IsFavorite");

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedMemes_MemeTemplateId",
                table: "GeneratedMemes",
                column: "MemeTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_MemeCategories_Name",
                table: "MemeCategories",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_MemeTemplates_MemeCategoryId",
                table: "MemeTemplates",
                column: "MemeCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_MemeTemplates_Title",
                table: "MemeTemplates",
                column: "Title");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GeneratedMemes");

            migrationBuilder.DropTable(
                name: "MemeTemplates");

            migrationBuilder.DropTable(
                name: "MemeCategories");
        }
    }
}
