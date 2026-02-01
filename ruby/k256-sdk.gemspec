# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "k256-sdk"
  spec.version       = "0.1.0"
  spec.authors       = ["K256"]
  spec.email         = ["support@k256.xyz"]

  spec.summary       = "Official Ruby SDK for K256 - the gateway to Solana's liquidity ecosystem"
  spec.description   = "Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability."
  spec.homepage      = "https://k256.xyz"
  spec.license       = "MIT"
  spec.required_ruby_version = ">= 3.0.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/k256-xyz/k256-sdks"
  spec.metadata["changelog_uri"] = "https://github.com/k256-xyz/k256-sdks/releases"
  spec.metadata["documentation_uri"] = "https://docs.k256.xyz"

  spec.files = Dir["lib/**/*.rb", "README.md", "LICENSE"]
  spec.require_paths = ["lib"]

  spec.add_dependency "websocket-client-simple", "~> 0.8"
  spec.add_dependency "json", "~> 2.6"

  spec.add_development_dependency "rspec", "~> 3.12"
  spec.add_development_dependency "rubocop", "~> 1.50"
end
