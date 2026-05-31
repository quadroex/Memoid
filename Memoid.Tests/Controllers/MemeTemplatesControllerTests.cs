using FluentAssertions;
using Memoid.Controllers;
using Memoid.DTOs;
using Memoid.Models;
using Memoid.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Tests.Controllers;

public class MemeTemplatesControllerTests
{
    [Fact]
    public async Task GetTemplates_WithCategoryFilter_ReturnsOnlyMatchingTemplates()
    {
        using var testDb = TestDbContextFactory.Create();
        var categoryA = CreateCategory("Category A");
        var categoryB = CreateCategory("Category B");
        testDb.Context.MemeCategories.AddRange(categoryA, categoryB);
        await testDb.Context.SaveChangesAsync();

        testDb.Context.MemeTemplates.AddRange(
            CreateTemplate("Template A", categoryA.Id),
            CreateTemplate("Template B", categoryB.Id));
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeTemplatesController(testDb.Context);

        var result = await controller.GetTemplates(categoryId: categoryA.Id);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Which;
        var templates = ok.Value.Should().BeAssignableTo<IEnumerable<MemeTemplateDto>>().Subject.ToList();
        templates.Should().ContainSingle(template => template.Title == "Template A");
        templates.Should().OnlyContain(template => template.MemeCategoryId == categoryA.Id);
    }

    [Fact]
    public async Task GetTemplate_UnknownId_ReturnsNotFound()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new MemeTemplatesController(testDb.Context);

        var result = await controller.GetTemplate(999);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task CreateTemplate_ValidRequest_CreatesTemplate()
    {
        using var testDb = TestDbContextFactory.Create();
        var category = CreateCategory("Active category");
        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeTemplatesController(testDb.Context);
        var request = new CreateMemeTemplateDto
        {
            Title = "  New template  ",
            ImagePath = "/uploads/templates/new-template.png",
            MemeCategoryId = category.Id
        };

        var result = await controller.CreateTemplate(request);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Which;
        created.ActionName.Should().Be(nameof(MemeTemplatesController.GetTemplate));

        var template = await testDb.Context.MemeTemplates.SingleAsync(template => template.Title == "New template");
        template.ImagePath.Should().Be("/uploads/templates/new-template.png");
        template.MemeCategoryId.Should().Be(category.Id);
    }

    [Fact]
    public async Task CreateTemplate_InvalidImagePath_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var category = CreateCategory("Active category");
        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeTemplatesController(testDb.Context);
        var request = new CreateMemeTemplateDto
        {
            Title = "New template",
            ImagePath = "/wrong/path/image.png",
            MemeCategoryId = category.Id
        };

        var result = await controller.CreateTemplate(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateTemplate_InactiveCategory_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var category = CreateCategory("Inactive category", isActive: false);
        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeTemplatesController(testDb.Context);
        var request = new CreateMemeTemplateDto
        {
            Title = "New template",
            ImagePath = "/uploads/templates/new-template.png",
            MemeCategoryId = category.Id
        };

        var result = await controller.CreateTemplate(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateTemplate_DuplicateTitle_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var category = CreateCategory("Active category");
        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        testDb.Context.MemeTemplates.Add(CreateTemplate("Duplicate", category.Id));
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeTemplatesController(testDb.Context);
        var request = new CreateMemeTemplateDto
        {
            Title = "Duplicate",
            ImagePath = "/uploads/templates/duplicate.png",
            MemeCategoryId = category.Id
        };

        var result = await controller.CreateTemplate(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteTemplate_WithGeneratedMemes_DeactivatesInsteadOfRemoving()
    {
        using var testDb = TestDbContextFactory.Create();
        var category = CreateCategory("Active category");
        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        var template = CreateTemplate("Template with meme", category.Id);
        testDb.Context.MemeTemplates.Add(template);
        await testDb.Context.SaveChangesAsync();

        testDb.Context.GeneratedMemes.Add(CreateGeneratedMeme("Template meme", template.Id));
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeTemplatesController(testDb.Context);

        var result = await controller.DeleteTemplate(template.Id);

        result.Should().BeOfType<NoContentResult>();

        testDb.Context.ChangeTracker.Clear();
        var deletedTemplate = await testDb.Context.MemeTemplates.FindAsync(template.Id);
        deletedTemplate.Should().NotBeNull();
        deletedTemplate!.IsActive.Should().BeFalse();
    }

    private static MemeCategory CreateCategory(string name, bool isActive = true)
    {
        return new MemeCategory
        {
            Name = name,
            IsActive = isActive
        };
    }

    private static MemeTemplate CreateTemplate(string title, int categoryId)
    {
        return new MemeTemplate
        {
            Title = title,
            ImagePath = $"/uploads/templates/{Guid.NewGuid():N}.png",
            MemeCategoryId = categoryId,
            IsActive = true
        };
    }

    private static GeneratedMeme CreateGeneratedMeme(string title, int templateId)
    {
        return new GeneratedMeme
        {
            Title = title,
            ImagePath = "/uploads/generated/template-meme.png",
            SourceType = "Template",
            MemeTemplateId = templateId,
            TextPosition = "Center",
            FontFamily = "Arial",
            FontSize = 48,
            TextColor = "#ffffff"
        };
    }
}
