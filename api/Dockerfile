# Production image for the Habits Tracker API (used by Render; see render.yaml).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY HabitsTracker.Api.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app ./
# Render sets PORT; the app binds to it. 8080 is the default when run elsewhere.
ENV PORT=8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "HabitsTracker.Api.dll"]
