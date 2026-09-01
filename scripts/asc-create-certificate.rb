#!/usr/bin/env ruby
# frozen_string_literal: true

# Generates a keypair and has Apple issue a development certificate against it.
#
# `fastlane cert` does the same thing, but it decides the .p12's password
# itself. Doing it here keeps the private key and its password under this
# workflow's control, which matters because the same .p12 is handed to the
# device: LiveContainer and similar apps need the private key to re-sign
# guest apps on-device, and can only accept it as a password-protected .p12.
#
# Writes key.pem (unencrypted — never publish it) and cert.cer into OUT_DIR.
# The caller combines them into a .p12 under a password of its choosing.
#
#   ASC_KEY_JSON=/path/key.json OUT_DIR=/tmp/certs ruby asc-create-certificate.rb

require 'fileutils'
require_relative 'asc_client'

out_dir = ENV.fetch('OUT_DIR')
common_name = ENV.fetch('CERT_COMMON_NAME', 'Automated signing')
FileUtils.mkdir_p(out_dir)

key = OpenSSL::PKey::RSA.new(2048)

csr = OpenSSL::X509::Request.new
csr.version = 0
csr.subject = OpenSSL::X509::Name.parse("/CN=#{common_name}")
csr.public_key = key.public_key
csr.sign(key, OpenSSL::Digest.new('SHA256'))

jwt = ASC.token(ASC.config_from(ENV.fetch('ASC_KEY_JSON')))
response = ASC.request(:post, '/v1/certificates', jwt, body: {
  data: {
    type: 'certificates',
    attributes: { certificateType: 'IOS_DEVELOPMENT', csrContent: csr.to_pem }
  }
})

unless response.code.to_i == 201
  # Apple's message is the useful part — most often the certificate cap.
  warn "::error::Creating the certificate failed (HTTP #{response.code}): #{response.body}"
  exit 1
end

attributes = JSON.parse(response.body).dig('data', 'attributes')
File.binwrite(File.join(out_dir, 'cert.cer'), Base64.decode64(attributes.fetch('certificateContent')))
File.write(File.join(out_dir, 'key.pem'), key.to_pem)
File.chmod(0o600, File.join(out_dir, 'key.pem'))

puts "Issued #{attributes['certificateType']} certificate #{attributes['serialNumber']}, expires #{attributes['expirationDate']}"
