namespace NeuronFlow.Server.Models
{
    public class CsvProfile
    {
    }

    public class AiSuggestions
    {
        public Dictionary<string, string> Improvements { get; set; }
        public List<string> Required_Fields { get; set; }
        public List<int> Malformed_Rows { get; set; }
    }
}
