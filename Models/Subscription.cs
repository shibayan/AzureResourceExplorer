using System.Text.Json.Serialization;

namespace ARMExplorer.Models
{
    public class Subscription : Resource
    {
        [JsonPropertyName("subscriptionId")]
        public string SubscriptionId { get; set; }
    }
}
