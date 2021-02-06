using System.Text.Json.Serialization;

namespace ARMExplorer.Models
{
    public class Resource
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
    }
}
