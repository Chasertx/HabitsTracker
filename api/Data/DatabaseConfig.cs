using Npgsql;

namespace HabitsTracker.Api.Data;

public static class DatabaseConfig
{
    /// <summary>
    /// Returns the PostgreSQL connection string. <c>DATABASE_URL</c> (the
    /// <c>postgres://user:pass@host:port/db</c> form that Render and most hosts provide) wins over
    /// <c>ConnectionStrings:Default</c>, which is used for local development.
    /// </summary>
    public static string GetConnectionString(IConfiguration configuration)
    {
        if (configuration["DATABASE_URL"] is { Length: > 0 } url)
            return FromUrl(url);

        return configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "No database configured. Set DATABASE_URL or ConnectionStrings:Default.");
    }

    private static string FromUrl(string url)
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':', 2);

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
        };

        // Honour ?sslmode=require (etc.) when the URL has it; otherwise use TLS whenever the server
        // offers it, which covers both Render (TLS) and a local Postgres without TLS.
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        builder.SslMode = Enum.TryParse<SslMode>(query["sslmode"], ignoreCase: true, out var mode)
            ? mode
            : SslMode.Prefer;

        return builder.ConnectionString;
    }
}
