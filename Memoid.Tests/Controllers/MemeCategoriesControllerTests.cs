using FluentAssertions;
using Memoid.Controllers;
using Memoid.DTOs;
using Memoid.Models;
using Memoid.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Tests.Controllers;

public class MemeCategoriesControllerTests
{
    [Fact]
    public async Task GetCategories_ReturnsOnlyActiveByDefault()
    {
        using var testDb = TestDbContextFactory.Create();
        testDb.Context.MemeCategories.AddRange(
            new MemeCategory { Name = "Активна", Description = "Активна категорія", IsActive = true },
            new MemeCategory { Name = "Неактивна", Description = "Неактивна категорія", IsActive = false });
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeCategoriesController(testDb.Context);

        var result = await controller.GetCategories();

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Which;
        var categories = ok.Value.Should().BeAssignableTo<IEnumerable<MemeCategoryDto>>().Subject.ToList();
        categories.Should().ContainSingle(category => category.Name == "Активна");
        categories.Should().NotContain(category => category.Name == "Неактивна");
    }

    [Fact]
    public async Task GetCategory_UnknownId_ReturnsNotFound()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new MemeCategoriesController(testDb.Context);

        var result = await controller.GetCategory(999);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task CreateCategory_ValidRequest_CreatesCategory()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new MemeCategoriesController(testDb.Context);
        var request = new CreateMemeCategoryDto
        {
            Name = "  Тестова категорія  ",
            Description = "  Категорія для тесту  "
        };

        var result = await controller.CreateCategory(request);

        var created = result.Result.Should().BeOfType<CreatedAtActionResult>().Which;
        created.ActionName.Should().Be(nameof(MemeCategoriesController.GetCategory));

        var category = await testDb.Context.MemeCategories.SingleAsync(category => category.Name == "Тестова категорія");
        category.Description.Should().Be("Категорія для тесту");
        category.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateCategory_EmptyName_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        var controller = new MemeCategoriesController(testDb.Context);
        var request = new CreateMemeCategoryDto
        {
            Name = "   ",
            Description = "Опис"
        };

        var result = await controller.CreateCategory(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateCategory_DuplicateName_ReturnsBadRequest()
    {
        using var testDb = TestDbContextFactory.Create();
        testDb.Context.MemeCategories.Add(new MemeCategory { Name = "Класика", Description = "Існуюча категорія" });
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeCategoriesController(testDb.Context);
        var request = new CreateMemeCategoryDto
        {
            Name = "Класика",
            Description = "Дублікат"
        };

        var result = await controller.CreateCategory(request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateCategory_ValidRequest_UpdatesCategory()
    {
        using var testDb = TestDbContextFactory.Create();
        var category = new MemeCategory
        {
            Name = "Стара назва",
            Description = "Старий опис",
            IsActive = true
        };
        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeCategoriesController(testDb.Context);
        var request = new UpdateMemeCategoryDto
        {
            Name = "  Нова назва  ",
            Description = "  Новий опис  ",
            IsActive = false
        };

        var result = await controller.UpdateCategory(category.Id, request);

        result.Should().BeOfType<NoContentResult>();

        testDb.Context.ChangeTracker.Clear();
        var updatedCategory = await testDb.Context.MemeCategories.FindAsync(category.Id);
        updatedCategory.Should().NotBeNull();
        updatedCategory!.Name.Should().Be("Нова назва");
        updatedCategory.Description.Should().Be("Новий опис");
        updatedCategory.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteCategory_WithTemplates_DeactivatesInsteadOfRemoving()
    {
        using var testDb = TestDbContextFactory.Create();
        var category = new MemeCategory { Name = "Категорія з шаблоном" };
        testDb.Context.MemeCategories.Add(category);
        await testDb.Context.SaveChangesAsync();

        testDb.Context.MemeTemplates.Add(new MemeTemplate
        {
            Title = "Тестовий шаблон",
            ImagePath = "/uploads/templates/test-template.png",
            MemeCategoryId = category.Id
        });
        await testDb.Context.SaveChangesAsync();

        var controller = new MemeCategoriesController(testDb.Context);

        var result = await controller.DeleteCategory(category.Id);

        result.Should().BeOfType<NoContentResult>();

        testDb.Context.ChangeTracker.Clear();
        var deletedCategory = await testDb.Context.MemeCategories.FindAsync(category.Id);
        deletedCategory.Should().NotBeNull();
        deletedCategory!.IsActive.Should().BeFalse();
    }
}
