using Memoid.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Tests.Helpers;

public static class TestDbContextFactory
{
    public static TestDbContext Create()
    {
        return new TestDbContext();
    }
}

public sealed class TestDbContext : IDisposable
{
    private readonly SqliteConnection _connection;

    public TestDbContext()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _connection.CreateFunction<string?, string?>("lower", value => value?.ToLowerInvariant());

        var options = new DbContextOptionsBuilder<MemoidDbContext>()
            .UseSqlite(_connection)
            .Options;

        Context = new MemoidDbContext(options);
        Context.Database.EnsureCreated();
        ClearSeedData();
    }

    public MemoidDbContext Context { get; }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }

    private void ClearSeedData()
    {
        Context.GeneratedMemes.RemoveRange(Context.GeneratedMemes);
        Context.MemeTemplates.RemoveRange(Context.MemeTemplates);
        Context.MemeCategories.RemoveRange(Context.MemeCategories);
        Context.SaveChanges();
    }
}
