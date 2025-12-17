using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Mvc;
using NeuronFlow.Server.Models;
using NeuronFlow.Server.Service;
using Newtonsoft.Json;
using System.Globalization;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/csv")]
    [ApiController]
    public class CsvController : ControllerBase
    {
        private readonly IOpenAiService _openAiService;

        public CsvController(IOpenAiService openAiService)
        {
            _openAiService = openAiService;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { Message = "No file uploaded or file is empty." });

            try
            {
                using var reader = new StreamReader(file.OpenReadStream());
                using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    DetectDelimiter = true,
                    BadDataFound = context =>
                    {
                        // This event triggers on bad data parsing
                        // Optionally, log or collect errors here
                    },
                    MissingFieldFound = null, // Skip missing fields errors
                    HeaderValidated = null,   // Skip header validation errors
                    IgnoreBlankLines = true,
                });

                if (!csv.Read() || !csv.ReadHeader())
                {
                    return BadRequest(new { Message = "CSV file missing headers or improperly formatted." });
                }

                var headers = csv.HeaderRecord;
                if (headers == null || headers.Length == 0)
                {
                    return BadRequest(new { Message = "CSV header is empty or missing." });
                }

                var rowCount = 0;
                var nullCount = 0;

                var errorRows = new List<int>();
                var expectedColumnCount = headers.Length;

                // For analysis: keep sample data and track nulls
                var sampleRows = new List<Dictionary<string, string>>();
                var nullTracker = new Dictionary<string, int>();

                foreach (var header in headers)
                {
                    nullTracker[header] = 0;
                }

                while (await csv.ReadAsync())
                {
                    rowCount++;
                    bool rowHasError = false;

                    var row = new Dictionary<string, string>();
                    for (int i = 0; i < expectedColumnCount; i++)
                    {
                        try
                        {
                            var field = csv.GetField(i);
                            row[headers[i]] = field;
                            if (string.IsNullOrWhiteSpace(field))
                            {
                                nullTracker[headers[i]]++;
                                nullCount++;
                            }
                        }
                        catch
                        {
                            rowHasError = true;
                        }
                    }

                    if (csv.Parser.Count != expectedColumnCount)
                    {
                        rowHasError = true;
                    }

                    if (rowHasError)
                    {
                        errorRows.Add(rowCount);
                    }

                    // Keep first 5 rows for sample analysis
                    if (sampleRows.Count < 5)
                    {
                        sampleRows.Add(new Dictionary<string, string>(row));
                    }
                }

                // Analyze sample data for type inference and required fields
                var headerAnalysis = new List<object>();
                foreach (var header in headers)
                {
                    var samples = sampleRows
                        .Where(r => r.ContainsKey(header) && !string.IsNullOrWhiteSpace(r[header]))
                        .Select(r => r[header])
                        .Take(3)
                        .ToList();

                    var inferredType = InferDataType(samples);
                    var isRequired = nullTracker[header] == 0; // No nulls → likely required

                    headerAnalysis.Add(new
                    {
                        name = header,
                        type = inferredType,
                        suggested = new
                        {
                            required = isRequired,
                            format = inferredType == "date" ? "YYYY-MM-DD" : null
                        }
                    });
                }

                var aiPrompts = JsonConvert.SerializeObject(new
                {
                    headers = headers,
                    sampleRows = sampleRows,
                    nullTracker = nullTracker
                }, Formatting.Indented);

                var prompt = $@"
                You are a CSV parsing assistant. 
                Analyze the CSV metadata and sample rows provided. 
                Suggest improved column types, required fields, and any fixes for malformed rows.
                Respond in JSON format.

                CSV Info:
                {aiPrompts}";

                // Call LLM for suggestions
                var aiSuggestionsJson = await _openAiService.GetChatCompletionAsync(prompt);
                var aiSuggestions = JsonConvert.DeserializeObject<AiSuggestions>(aiSuggestionsJson);

                return Ok(new
                {
                    Headers = headers,
                    RowCount = rowCount,
                    NullCount = nullCount,
                    CorruptedRows = errorRows,
                    Analysis = headerAnalysis,
                    AiSuggestions = aiSuggestions,
                    Message = errorRows.Count > 0 ? "CSV parsed with some corrupted rows." : "CSV parsed successfully."
                });
            }
            catch (HeaderValidationException ex)
            {
                return BadRequest(new { Message = "CSV header validation failed.", Detail = ex.Message });
            }
            catch (BadDataException ex)
            {
                return BadRequest(new { Message = "CSV contains malformed data.", Detail = ex.Message });
            }
            catch (ReaderException ex)
            {
                return BadRequest(new { Message = "CSV reading error occurred.", Detail = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "An unexpected error occurred.", Detail = ex.Message });
            }
        }

        private string InferDataType(List<string> sampleValues)
        {
            if (!sampleValues.Any())
                return "string";

            if (sampleValues.All(v => DateTime.TryParse(v, out _)))
                return "date";

            if (sampleValues.All(v => bool.TryParse(v, out _)))
                return "boolean";

            if (sampleValues.All(v => int.TryParse(v, out _)))
                return "integer";

            if (sampleValues.All(v => double.TryParse(v, out _)))
                return "number";

            if (sampleValues.All(v => IsEmail(v)))
                return "email";

            if (sampleValues.All(v => Uri.TryCreate(v, UriKind.Absolute, out _)))
                return "url";

            if (sampleValues.All(v => IsJson(v)))
                return "json";

            if (sampleValues.All(v => IsLatitudeLongitude(v)))
                return "geolocation";

            return "string";
        }

        private bool IsEmail(string value)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(value);
                return addr.Address == value;
            }
            catch
            {
                return false;
            }
        }

        private bool IsJson(string value)
        {
            value = value.Trim();
            return (value.StartsWith("{") && value.EndsWith("}")) ||
                   (value.StartsWith("[") && value.EndsWith("]"));
        }

        private bool IsLatitudeLongitude(string value)
        {
            var parts = value.Split(',');
            if (parts.Length != 2) return false;
            return double.TryParse(parts[0], out _) && double.TryParse(parts[1], out _);
        }
    }
}
