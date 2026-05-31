using FluentAssertions;
using Memoid.Controllers;
using Memoid.DTOs;
using Memoid.Models;
using Memoid.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Tests.Controllers;

public class GeneratedMemesControllerTests
{
    [Fact]
    public async Task GetGeneratedMemes_FavoritesOnly_ReturnsOnlyFavorites()
    {
        using var testDb = TestDbContextFactory.Create();
        testDb.Context.GeneratedMemes.AddRange(
            CreateGeneratedMeme("Favorite meme", isFavorite: true),
            CreateGeneratedMeme("Regular meme", isFavorite: false));
        await testDb.Context.SaveChangesAsync();

        var controller = new GeneratedMemesController(testDb.Context);

        var result = await controller.GetGeneratedMemes(favoritesOnly: true);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Which;
        var memes = ok.Value.Should().BeAssignableTo<IEnumerable<GeneratedMemeDto>>().Subject.ToList();
        memes.Should().ContainSingle(meme => meme.Title == "Favorite meme");
        memes.Should().OnlyContain(meme => meme.IsFavorite);
    }

    [Fact]
    public async Task GetGeneratedMeme_UnknownId_ReturnsNotFound()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new GeneratedMemesController(testDb.Context);

        var result = await controller.GetGeneratedMeme(999);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task CreateGeneratedMeme_CustomSource_ValidRequest_CreatesMeme()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new GeneratedMemesController(testDb.Context);
        var request = CreateValidCustomGeneratedMemeRequest();

        var result = await controller.CreateGeneratedMeme(request);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Which;
        created.ActionName.Should().Be(nameof(GeneratedMemesController.GetGeneratedMeme));

        var meme = await testDb.Context.GeneratedMemes.SingleAsync(meme => meme.Title == "Custom meme");
        meme.SourceType.Should().Be("Custom");
        meme.MemeTemplateId.Should().BeNull();
    }

    [Fact]
    public async Task CreateGeneratedMeme_TemplateSource_ValidRequest_CreatesMeme()
    {
        using var testDb = TestDbContextFactory.Create();
        var template = await SeedActiveTemplateAsync(testDb);
        var controller = new GeneratedMemesController(testDb.Context);
        var request = CreateValidTemplateGeneratedMemeRequest(template.Id);

        var result = await controller.CreateGeneratedMeme(request);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Which;
        created.ActionName.Should().Be(nameof(GeneratedMemesController.GetGeneratedMeme));

        var meme = await testDb.Context.GeneratedMemes.SingleAsync(meme => meme.Title == "Template meme");
        meme.MemeTemplateId.Should().Be(template.Id);
    }

    [Fact]
    public async Task CreateGeneratedMeme_TitleTooShort_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new GeneratedMemesController(testDb.Context);
        var request = CreateValidCustomGeneratedMemeRequest();
        request.Title = "ab";

        var result = await controller.CreateGeneratedMeme(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateGeneratedMeme_TitleTooLong_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new GeneratedMemesController(testDb.Context);
        var request = CreateValidCustomGeneratedMemeRequest();
        request.Title = "This title is definitely too long";

        var result = await controller.CreateGeneratedMeme(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateGeneratedMeme_InvalidGeneratedImagePath_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new GeneratedMemesController(testDb.Context);
        var request = CreateValidCustomGeneratedMemeRequest();
        request.ImagePath = "/uploads/custom/wrong.png";

        var result = await controller.CreateGeneratedMeme(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateGeneratedMeme_TemplateWithoutTemplateId_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new GeneratedMemesController(testDb.Context);
        var request = CreateValidCustomGeneratedMemeRequest();
        request.SourceType = "Template";
        request.MemeTemplateId = null;
        request.OriginalImagePath = null;

        var result = await controller.CreateGeneratedMeme(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateGeneratedMeme_ValidRequest_UpdatesTitleAndFavorite()
    {
        using var testDb = TestDbContextFactory.Create();
        var meme = CreateGeneratedMeme("Old title", isFavorite: false);
        testDb.Context.GeneratedMemes.Add(meme);
        await testDb.Context.SaveChangesAsync();

        var controller = new GeneratedMemesController(testDb.Context);
        var request = new UpdateGeneratedMemeDto
        {
            Title = "New title",
            IsFavorite = true
        };

        var result = await controller.UpdateGeneratedMeme(meme.Id, request);

        result.Should().BeOfType<NoContentResult>();

        testDb.Context.ChangeTracker.Clear();
        var updatedMeme = await testDb.Context.GeneratedMemes.FindAsync(meme.Id);
        updatedMeme.Should().NotBeNull();
        updatedMeme!.Title.Should().Be("New title");
        updatedMeme.IsFavorite.Should().BeTrue();
    }

    [Fact]
    public async Task ToggleFavorite_ExistingMeme_TogglesFavorite()
    {
        using var testDb = TestDbContextFactory.Create();
        var meme = CreateGeneratedMeme("Toggle meme", isFavorite: false);
        testDb.Context.GeneratedMemes.Add(meme);
        await testDb.Context.SaveChangesAsync();

        var controller = new GeneratedMemesController(testDb.Context);

        var result = await controller.ToggleFavorite(meme.Id);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Which;
        var dto = ok.Value.Should().BeOfType<GeneratedMemeDto>().Which;
        dto.IsFavorite.Should().BeTrue();

        testDb.Context.ChangeTracker.Clear();
        var updatedMeme = await testDb.Context.GeneratedMemes.FindAsync(meme.Id);
        updatedMeme.Should().NotBeNull();
        updatedMeme!.IsFavorite.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteGeneratedMeme_ExistingMeme_RemovesMeme()
    {
        using var testDb = TestDbContextFactory.Create();
        var meme = CreateGeneratedMeme("Delete meme");
        testDb.Context.GeneratedMemes.Add(meme);
        await testDb.Context.SaveChangesAsync();

        var controller = new GeneratedMemesController(testDb.Context);

        var result = await controller.DeleteGeneratedMeme(meme.Id);

        result.Should().BeOfType<NoContentResult>();
        var deletedMeme = await testDb.Context.GeneratedMemes.FindAsync(meme.Id);
        deletedMeme.Should().BeNull();
    }

    private static CreateGeneratedMemeDto CreateValidCustomGeneratedMemeRequest()
    {
        return new CreateGeneratedMemeDto
        {
            Title = "Custom meme",
            ImagePath = "/uploads/generated/custom.png",
            SourceType = "Custom",
            OriginalImagePath = "/uploads/custom/original.png",
            TopText = "Center text",
            BottomText = null,
            TextPosition = "Center",
            FontFamily = "Arial",
            FontSize = 48,
            TextColor = "#ffffff",
            TextBackgroundColor = null,
            AppliedEffect = "None"
        };
    }

    private static CreateGeneratedMemeDto CreateValidTemplateGeneratedMemeRequest(int templateId)
    {
        return new CreateGeneratedMemeDto
        {
            Title = "Template meme",
            ImagePath = "/uploads/generated/template.png",
            SourceType = "Template",
            MemeTemplateId = templateId,
            OriginalImagePath = null,
            TopText = "Top text",
            BottomText = "Bottom text",
            TextPosition = "TopAndBottom",
            FontFamily = "Arial",
            FontSize = 48,
            TextColor = "#ffffff",
            TextBackgroundColor = null,
            AppliedEffect = "None"
        };
    }

    private static async Task<MemeTemplate> SeedActiveTemplateAsync(TestDbContext testDb)
    {
        var category = new MemeCategory
        {
            Name = "Template category",
            IsActive = true
        };

        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        var template = new MemeTemplate
        {
            Title = "Active template",
            ImagePath = "/uploads/templates/active-template.png",
            MemeCategoryId = category.Id,
            IsActive = true
        };

        testDb.Context.MemeTemplates.Add(template);
        await testDb.Context.SaveChangesAsync();

        return template;
    }

    private static GeneratedMeme CreateGeneratedMeme(string title, bool isFavorite = false)
    {
        return new GeneratedMeme
        {
            Title = title,
            ImagePath = $"/uploads/generated/{Guid.NewGuid():N}.png",
            SourceType = "Custom",
            OriginalImagePath = "/uploads/custom/original.png",
            TextPosition = "Center",
            FontFamily = "Arial",
            FontSize = 48,
            TextColor = "#ffffff",
            IsFavorite = isFavorite
        };
    }
}
