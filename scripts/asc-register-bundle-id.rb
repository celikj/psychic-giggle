#!/usr/bin/env ruby
# frozen_string_literal: true

# Registers an App ID on the developer portal through the App Store Connect
# API, and does nothing if it already exists.
#
# fastlane's `produce` action is the usual way to do this, but it only knows
# how to authenticate with a username and password — it rejects api_key_path
# outright ("Could not find option 'api_key_path'"). Since the whole point of
# this pipeline is that it runs unattended with nothing but the API key, the
# call is made directly here instead.
#
# Signs its own ES256 JWT with the stdlib, so it needs no gems.
#
#   ASC_KEY_JSON=/path/to/key.json BUNDLE_ID=com.example.app ruby asc-register-bundle-id.rb

require 'openssl'
require 'base64'
require 'json'
require 'net/http'
require 'uri'

key_path = ENV.fetch('ASC_KEY_JSON')
identifier = ENV.fetch('BUNDLE_ID')

config = JSON.parse(File.read(key_path))
private_key = OpenSSL::PKey.read(config.fetch('key'))

def b64(data)
  Base64.urlsafe_encode64(data, padding: false)
end

now = Time.now.to_i
header = { 'alg' => 'ES256', 'kid' => config.fetch('key_id'), 'typ' => 'JWT' }
claims = {
  'iss' => config.fetch('issuer_id'),
  'iat' => now,
  'exp' => now + 600, # Apple rejects anything longer than 20 minutes.
  'aud' => 'appstoreconnect-v1'
}
signing_input = "#{b64(JSON.dump(header))}.#{b64(JSON.dump(claims))}"

# OpenSSL hands back a DER-encoded (r, s) pair; JWS wants them raw and
# left-padded to the curve size, concatenated.
der = private_key.sign(OpenSSL::Digest.new('SHA256'), signing_input)
r, s = OpenSSL::ASN1.decode(der).value.map { |v| v.value.to_s(2).rjust(32, "\x00") }
jwt = "#{signing_input}.#{b64(r + s)}"

# Apple only allows alphanumerics and spaces in the name, so it can't just be
# the identifier.
name = identifier.tr('.', ' ').gsub(/[^A-Za-z0-9 ]/, ' ').squeeze(' ').strip

uri = URI('https://api.appstoreconnect.apple.com/v1/bundleIds')
request = Net::HTTP::Post.new(uri)
request['Authorization'] = "Bearer #{jwt}"
request['Content-Type'] = 'application/json'
request.body = JSON.dump(
  data: {
    type: 'bundleIds',
    attributes: { identifier: identifier, name: name, platform: 'IOS' }
  }
)

response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }

case response.code.to_i
when 201
  puts "Registered App ID #{identifier}"
when 409
  # Already registered — by an earlier run, or by this account long ago.
  puts "App ID #{identifier} already exists, continuing"
else
  # The body is Apple's error detail; it carries no credentials.
  warn "::error::Registering the App ID failed (HTTP #{response.code}): #{response.body}"
  exit 1
end
