#!/usr/bin/env ruby
# frozen_string_literal: true

# Registers an App ID on the developer portal, and does nothing if it already
# exists.
#
# fastlane's `produce` action is the usual way to do this, but it only knows
# how to authenticate with a username and password — it rejects api_key_path
# outright ("Could not find option 'api_key_path'"). Since the whole point of
# this pipeline is that it runs unattended with nothing but the API key, the
# call is made directly here instead.
#
#   ASC_KEY_JSON=/path/to/key.json BUNDLE_ID=com.example.app ruby asc-register-bundle-id.rb

require_relative 'asc_client'

identifier = ENV.fetch('BUNDLE_ID')
jwt = ASC.token(ASC.config_from(ENV.fetch('ASC_KEY_JSON')))

# Apple only allows alphanumerics and spaces in the name, so it can't just be
# the identifier.
name = identifier.tr('.', ' ').gsub(/[^A-Za-z0-9 ]/, ' ').squeeze(' ').strip

response = ASC.request(:post, '/v1/bundleIds', jwt, body: {
  data: {
    type: 'bundleIds',
    attributes: { identifier: identifier, name: name, platform: 'IOS' }
  }
})

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
