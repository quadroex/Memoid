using Memoid.Data;
using Memoid.DTOs;
using Memoid.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Controllers;

/// <summary>
/// API для категорій.
/// </summary>
[ApiController]
[Tags("Meme Categories")]
[Route("api/meme-categories")]
public class MemeCategoriesController : ControllerBase
{
    private readonly MemoidDbContext _context;

    public MemeCategoriesController(MemoidDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Повертає список категорій, за замовчуванням тільки активних.
    /// </summary>
    /// <param name="includeInactive">Якщо true, додає неакитвні категорії.</param>
    /// <returns>Список категорій із кількістю шаблонів.</returns>
    [ProducesResponseType(typeof(IEnumerable<MemeCategoryDto>), StatusCodes.Status200OK)]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MemeCategoryDto>>> GetCategories(bool includeInactive = false)
    {
        var query = _context.MemeCategories.AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(category => category.IsActive);
        }

        var categories = await query
            .OrderBy(category => category.Name)
            .Select(category => ToDto(category, category.Templates.Count))
            .ToListAsync();

        return Ok(categories);
    }

    /// <summary>
    /// Повертає одну категорію за id.
    /// </summary>
    /// <param name="id">Id категорії.</param>
    /// <returns>Категорія з кількістю шаблонів.</returns>
    [ProducesResponseType(typeof(MemeCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<MemeCategoryDto>> GetCategory(int id)
    {
        var category = await _context.MemeCategories
            .AsNoTracking()
            .Where(category => category.Id == id)
            .Select(category => ToDto(category, category.Templates.Count))
            .FirstOrDefaultAsync();

        if (category is null)
        {
            return NotFound("Категорію не знайдено.");
        }

        return Ok(category);
    }

    /// <summary>
    /// Створює нову категорію шаблонів.
    /// </summary>
    /// <param name="request">Назва та опис.</param>
    /// <returns>Створена категорія.</returns>
    [ProducesResponseType(typeof(MemeCategoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [HttpPost]
    public async Task<ActionResult<MemeCategoryDto>> CreateCategory(CreateMemeCategoryDto request)
    {
        var validationError = ValidateCategory(request.Name, request.Description);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var name = NormalizeRequiredText(request.Name);
        var description = NormalizeOptionalText(request.Description);

        if (await CategoryNameExistsAsync(name))
        {
            return BadRequest("Категорія з такою назвою вже існує.");
        }

        var category = new MemeCategory
        {
            Name = name,
            Description = description
        };

        _context.MemeCategories.Add(category);
        await _context.SaveChangesAsync();

        var dto = ToDto(category, templatesCount: 0);

        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, dto);
    }

    /// <summary>
    /// Оновлює назву, опис і статус активності категорії.
    /// </summary>
    /// <param name="id">Id категорії.</param>
    /// <param name="request">Нові дані категорії.</param>
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, UpdateMemeCategoryDto request)
    {
        var category = await _context.MemeCategories.FindAsync(id);
        if (category is null)
        {
            return NotFound("Категорію не знайдено.");
        }

        var validationError = ValidateCategory(request.Name, request.Description);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var name = NormalizeRequiredText(request.Name);
        var description = NormalizeOptionalText(request.Description);

        if (await CategoryNameExistsAsync(name, id))
        {
            return BadRequest("Категорія з такою назвою вже існує.");
        }

        category.Name = name;
        category.Description = description;
        category.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Видаляє категорію або деактивує її, якщо вона має шаблони.
    /// </summary>
    /// <param name="id">Id категорії.</param>
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.MemeCategories.FindAsync(id);
        if (category is null)
        {
            return NotFound("Категорію не знайдено.");
        }

        var hasTemplates = await _context.MemeTemplates.AnyAsync(template => template.MemeCategoryId == id);

        if (hasTemplates)
        {
            category.IsActive = false;
        }
        else
        {
            _context.MemeCategories.Remove(category);
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> CategoryNameExistsAsync(string name, int? excludeId = null)
    {
        var normalizedName = name.ToLower();

        return await _context.MemeCategories.AnyAsync(category =>
            category.Name.ToLower() == normalizedName &&
            (!excludeId.HasValue || category.Id != excludeId.Value));
    }

    private static string? ValidateCategory(string? name, string? description)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "Назва категорії не може бути порожньою.";
        }

        if (name.Trim().Length > 80)
        {
            return "Назва категорії не може бути довшою за 80 символів.";
        }

        if (description?.Trim().Length > 300)
        {
            return "Опис категорії не може бути довшим за 300 символів.";
        }

        return null;
    }

    private static MemeCategoryDto ToDto(MemeCategory category, int templatesCount)
    {
        return new MemeCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            CreatedAt = category.CreatedAt,
            IsActive = category.IsActive,
            TemplatesCount = templatesCount
        };
    }

    private static string NormalizeRequiredText(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }
}
