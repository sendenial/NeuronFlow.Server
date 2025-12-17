using System.Net.Http.Headers;
using System.Text.Json;
using System.Text;

namespace NeuronFlow.Server.Service
{
    public class OpenAiService : IOpenAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public OpenAiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["OpenAI:ApiKey"];
        }

        public async Task<string> GetChatCompletionAsync(string prompt)
        {
            if (string.IsNullOrEmpty(_apiKey))
                throw new InvalidOperationException("OpenAI API key is not configured.");

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var requestBody = new
            {
                model = "gpt-3.5-turbo", // Explicitly using GPT-4 model
                messages = new[]
                {
                    new { role = "user", content = prompt }
                },
                temperature = 0.7, // Adjust creativity if needed
                max_tokens = 1000   // Control the response length
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new ApplicationException($"OpenAI API error: {responseString}");

            var result = JsonSerializer.Deserialize<JsonElement>(responseString);

            var messageContent = result
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return messageContent;
        }
    }
}
