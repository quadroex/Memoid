using System.ComponentModel.DataAnnotations;

namespace Memoid.Models;

public class MemeCategory
{
    public int Id { get; set; }

    [Required]
    [MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    public ICollection<MemeTemplate> Templates { get; set; } = new List<MemeTemplate>();
}
