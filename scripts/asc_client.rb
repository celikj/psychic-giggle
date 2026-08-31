# frozen_string_literal: true

# Minimal App Store Connect API client.
#
# Signs its own ES256 JWT with the Ruby stdlib, so it needs no gems — fastlane
# ships one, but its `produce` action refuses api_key_path and its `cert`
# action can't revoke, so the calls that matter here are made directly.

require 'openssl'
require 'base64'
require 'json'
require 'net/http'
require 'uri'

module ASC
  HOST = 'api.appstoreconnect.apple.com'

  module_function

  def b64(data)
    Base64.urlsafe_encode64(data, padding: false)
  end

  # config comes from the JSON fastlane also reads: key_id, issuer_id, key.
  def token(config)
    private_key = OpenSSL::PKey.read(config.fetch('key'))
    now = Time.now.to_i
    header = { 'alg' => 'ES256', 'kid' => config.fetch('key_id'), 'typ' => 'JWT' }
    claims = {
      'iss' => config.fetch('issuer_id'),
      'iat' => now,
      'exp' => now + 600, # Apple rejects anything beyond 20 minutes.
      'aud' => 'appstoreconnect-v1'
    }
    signing_input = "#{b64(JSON.dump(header))}.#{b64(JSON.dump(claims))}"

    # OpenSSL returns a DER-encoded (r, s) pair; JWS wants them raw, each
    # left-padded to the curve size, concatenated.
    der = private_key.sign(OpenSSL::Digest.new('SHA256'), signing_input)
    r, s = OpenSSL::ASN1.decode(der).value.map { |v| v.value.to_s(2).rjust(32, "\x00") }
    "#{signing_input}.#{b64(r + s)}"
  end

  def config_from(path)
    JSON.parse(File.read(path))
  end

  def request(method, path, jwt, body: nil)
    uri = URI("https://#{HOST}#{path}")
    klass = { get: Net::HTTP::Get, post: Net::HTTP::Post, delete: Net::HTTP::Delete }.fetch(method)
    req = klass.new(uri)
    req['Authorization'] = "Bearer #{jwt}"
    req['Content-Type'] = 'application/json'
    req.body = JSON.dump(body) if body
    Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
  end
end
