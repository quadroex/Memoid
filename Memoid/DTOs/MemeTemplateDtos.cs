namespace Memoid.DTOs;

public class MemeTemplateDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string ImagePath { get; set; } = string.Empty;

    public int MemeCategoryId { get; set; }

    public string? CategoryName { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }

    public int GeneratedMemesCount { get; set; }
}

public class CreateMemeTemplateDto
{
    public string? Title { get; set; }

    public string? ImagePath { get; set; }

    public int MemeCategoryId { get; set; }
}

public class UpdateMemeTemplateDto
{
    public string? Title { get; set; }

    public string? ImagePath { get; set; }

    public int MemeCategoryId { get; set; }

    public bool IsActive { get; set; }
}
