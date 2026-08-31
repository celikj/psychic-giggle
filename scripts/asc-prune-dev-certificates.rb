#!/usr/bin/env ruby
# frozen_string_literal: true

# Revokes development certificates so a fresh one can be issued.
#
# Signing on a throwaway runner needs a certificate *and* its private key. The
# key only exists on the machine that generated it, so every run has to mint a
# new certificate — and Apple caps how many development certificates may exist,
# which the cap then blocks permanently:
#
#   Could not create another Development certificate, reached the maximum
#   number of available Development certificates.
#
# Revoking by hand buys exactly one run. Pruning here instead keeps the account
# at a steady state of one development certificate: the one this run is about
# to create.
#
# Only DEVELOPMENT types are touched. Distribution certificates — which is what
# App Store and TestFlight builds are signed with, via Xcode's cloud signing —
# are left alone.
#
#   ASC_KEY_JSON=/path/key.json ruby asc-prune-dev-certificates.rb [keep]

require_relative 'asc_client'

DEV_TYPES = %w[DEVELOPMENT IOS_DEVELOPMENT MAC_APP_DEVELOPMENT].freeze

keep = (ARGV[0] || '0').to_i
jwt = ASC.token(ASC.config_from(ENV.fetch('ASC_KEY_JSON')))

response = ASC.request(:get, '/v1/certificates?limit=200', jwt)
unless response.code.to_i == 200
  warn "::error::Listing certificates failed (HTTP #{response.code}): #{response.body}"
  exit 1
end

certificates = JSON.parse(response.body).fetch('data')
development = certificates.select { |c| DEV_TYPES.include?(c['attributes']['certificateType']) }

puts "#{certificates.length} certificates on the account, #{development.length} of them development."
certificates.reject { |c| DEV_TYPES.include?(c['attributes']['certificateType']) }.each do |c|
  puts "  keeping #{c['attributes']['certificateType']} #{c['attributes']['serialNumber']} (not a development certificate)"
end

# Oldest first, so anything kept is the most recently issued.
development.sort_by! { |c| c['attributes']['expirationDate'].to_s }
doomed = keep.zero? ? development : development[0...-keep]

(doomed || []).each do |cert|
  id = cert['id']
  name = cert['attributes']['name']
  result = ASC.request(:delete, "/v1/certificates/#{id}", jwt)
  if [200, 204].include?(result.code.to_i)
    puts "  revoked #{name} (#{id})"
  else
    # Not fatal: the certificate may already be gone, and the run only needs
    # enough headroom for one more.
    warn "  could not revoke #{name} (#{id}): HTTP #{result.code}"
  end
end

puts "Development certificates remaining: #{[development.length - (doomed || []).length, 0].max}"
