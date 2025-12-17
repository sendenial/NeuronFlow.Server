using Microsoft.AspNetCore.Mvc;
using NeuronFlow.Server.Models;
using Newtonsoft.Json.Linq;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/openapi")]
    [ApiController]
    public class OpenApiController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public OpenApiController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("parse")]
        public async Task<IActionResult> Parse([FromBody] OpenApiSpec request)
        {
            if (string.IsNullOrWhiteSpace(request.Url))
                return BadRequest("URL is required.");

            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync(request.Url);

                if (!response.IsSuccessStatusCode)
                    return BadRequest($"Unable to fetch OpenAPI spec. Status code: {response.StatusCode}");

                var content = await response.Content.ReadAsStringAsync();
                var openApiJson = JObject.Parse(content);

                // Extract paths
                var paths = openApiJson["paths"]?.ToObject<Dictionary<string, object>>() ?? new Dictionary<string, object>();

                // Extract schemas for OpenAPI v3 or v2
                JObject schemas = null;

                if (openApiJson["components"]?["schemas"] is JObject compSchemas)
                {
                    schemas = compSchemas; // OpenAPI v3
                }
                else if (openApiJson["definitions"] is JObject defSchemas)
                {
                    schemas = defSchemas; // OpenAPI v2
                }
                else
                {
                    schemas = new JObject(); // fallback
                }

                // Build models
                var result = schemas.Properties().Select(schema =>
                {
                    var schemaObject = schema.Value as JObject;
                    var properties = schemaObject?["properties"] as JObject;

                    var parsedProperties = properties?.Properties().ToDictionary(
                        prop => prop.Name,
                        prop => new PropertyDetail
                        {
                            Type = prop.Value["type"]?.ToString(),
                            Format = prop.Value["format"]?.ToString(),
                            Nullable = prop.Value["nullable"]?.ToString()
                        }) ?? new Dictionary<string, PropertyDetail>();

                    return new
                    {
                        model = schema.Name,
                        properties = parsedProperties,
                        endpoints = paths.Keys
                            .Where(endpoint => endpoint.IndexOf(schema.Name, StringComparison.OrdinalIgnoreCase) >= 0)
                            .ToList()
                    };
                }).ToList();

                return Ok(new
                {
                    SwaggerUrl = request.Url,
                    Endpoints = paths.Keys.ToList(),
                    Models = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error parsing OpenAPI spec: {ex.Message}");
            }
        }


    }
}
