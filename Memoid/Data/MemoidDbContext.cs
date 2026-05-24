using Memoid.Models;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Data;

public class MemoidDbContext : DbContext
{
    public MemoidDbContext(DbContextOptions<MemoidDbContext> options)
        : base(options)
    {
    }

    public DbSet<MemeCategory> MemeCategories { get; set; }

    public DbSet<MemeTemplate> MemeTemplates { get; set; }

    public DbSet<GeneratedMeme> GeneratedMemes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MemeCategory>()
            .HasMany(category => category.Templates)
            .WithOne(template => template.MemeCategory)
            .HasForeignKey(template => template.MemeCategoryId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MemeTemplate>()
            .HasMany(template => template.GeneratedMemes)
            .WithOne(generatedMeme => generatedMeme.MemeTemplate)
            .HasForeignKey(generatedMeme => generatedMeme.MemeTemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MemeCategory>()
            .HasIndex(category => category.Name);

        modelBuilder.Entity<MemeTemplate>()
            .HasIndex(template => template.Title);

        modelBuilder.Entity<GeneratedMeme>()
            .HasIndex(generatedMeme => generatedMeme.CreatedAt);

        modelBuilder.Entity<GeneratedMeme>()
            .HasIndex(generatedMeme => generatedMeme.IsFavorite);

        var seedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        modelBuilder.Entity<MemeCategory>().HasData(
            new MemeCategory
            {
                Id = 1,
                Name = "Класика",
                Description = "Класичні шаблони для мемів",
                CreatedAt = seedDate,
                IsActive = true
            },
            new MemeCategory
            {
                Id = 2,
                Name = "Реакції",
                Description = "Шаблони для реакцій та відповідей",
                CreatedAt = seedDate,
                IsActive = true
            },
            new MemeCategory
            {
                Id = 3,
                Name = "Навчання",
                Description = "Меми про навчання, дедлайни та програмування",
                CreatedAt = seedDate,
                IsActive = true
            },
            new MemeCategory
            {
                Id = 4,
                Name = "Тварини",
                Description = "Меми з тваринами",
                CreatedAt = seedDate,
                IsActive = true
            });

        modelBuilder.Entity<MemeTemplate>().HasData(
            new MemeTemplate
            {
                Id = 1,
                Title = "Класичний шаблон",
                MemeCategoryId = 1,
                ImagePath = "/uploads/templates/classic-template-1.png",
                CreatedAt = seedDate,
                IsActive = true
            },
            new MemeTemplate
            {
                Id = 2,
                Title = "Реакція",
                MemeCategoryId = 2,
                ImagePath = "/uploads/templates/reaction-template-1.png",
                CreatedAt = seedDate,
                IsActive = true
            },
            new MemeTemplate
            {
                Id = 3,
                Title = "Навчальний мем",
                MemeCategoryId = 3,
                ImagePath = "/uploads/templates/study-template-1.png",
                CreatedAt = seedDate,
                IsActive = true
            },
            new MemeTemplate
            {
                Id = 4,
                Title = "Мем з твариною",
                MemeCategoryId = 4,
                ImagePath = "/uploads/templates/animal-template-1.png",
                CreatedAt = seedDate,
                IsActive = true
            });
    }
}
