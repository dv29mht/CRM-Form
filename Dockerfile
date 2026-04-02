FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["backend/CRMForm.API/CRMForm.API.csproj", "backend/CRMForm.API/"]
RUN dotnet restore "backend/CRMForm.API/CRMForm.API.csproj"
COPY . .
RUN dotnet publish "backend/CRMForm.API/CRMForm.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CRMForm.API.dll"]
