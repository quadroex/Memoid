namespace Memoid.DTOs;

public class MemeCategoryDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }

    public bool IsActive { get; set; }

    public int TemplatesCount { get; set; }
}

public class CreateMemeCategoryDto
{
    public string? Name { get; set; }

    public string? Description { get; set; }
}

public class UpdateMemeCategoryDto
{
    public string? Name { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; }
}
