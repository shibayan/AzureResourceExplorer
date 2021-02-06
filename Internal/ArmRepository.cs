using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using ARMExplorer.Models;

namespace ARMExplorer.Internal
{
    public class ArmRepository
    {
        public ArmRepository(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        private readonly HttpClient _httpClient;

        private const string ApiVersion = "2020-10-01";
        private const int MaxNextLinkDepth = 20;

        public Task<IReadOnlyList<Tenant>> GetTenantsAsync()
        {
            return GetResourcesCoreAsync<Tenant>($"tenants?api-version={ApiVersion}");
        }

        public Task<IReadOnlyList<Subscription>> GetSubscriptionsAsync()
        {
            return GetResourcesCoreAsync<Subscription>($"subscriptions?api-version={ApiVersion}");
        }

        public Task<IReadOnlyList<T>> GetResourcesAsync<T>(string subscriptionId, string keyword = null)
        {
            var path = string.IsNullOrEmpty(keyword) ?
                $"subscriptions/{subscriptionId}/resources?$top=1000&api-version={ApiVersion}" :
                $"subscriptions/{subscriptionId}/resources?$filter=tagname eq '{keyword}'&$top=1000&api-version={ApiVersion}";

            return GetResourcesCoreAsync<T>(path);
        }

        public async Task<HashSet<string>> GetProvidersAsync(string subscriptionId)
        {
            var uniqueProviders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var resources = await GetResourcesCoreAsync<Resource>($"subscriptions/{subscriptionId}/resources?api-version={ApiVersion}");

            foreach (var resource in resources)
            {
                var match = Regex.Match(resource.Id, "/subscriptions/.*?/resourceGroups/(.*?)/providers/(.*?)/(.*?)/");

                if (match.Success)
                {
                    var provider = match.Groups[2].Value.ToUpperInvariant();

                    uniqueProviders.Add(provider);
                }
            }

            return uniqueProviders;
        }

        private async Task<IReadOnlyList<T>> GetResourcesCoreAsync<T>(string path)
        {
            int currentNextLinkDepth = 0;
            var resources = new List<T>();

            while (!string.IsNullOrEmpty(path))
            {
                var response = await _httpClient.GetAsync(path);

                var content = await response.Content.ReadFromJsonAsync<Response<T>>();

                if (content.Value.Length == 0)
                {
                    break;
                }

                if (currentNextLinkDepth++ > MaxNextLinkDepth)
                {
                    break;
                }

                resources.AddRange(content.Value);

                path = content.NextLink;
            }

            return resources;
        }
    }
}
