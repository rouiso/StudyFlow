import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

/// Client HTTP de base vers le backend StudyFlow.
class ApiClient {
  ApiClient({String? baseUrl})
      : baseUrl = baseUrl ?? (kIsWeb ? 'http://localhost:3000' : 'http://10.0.2.2:3000');

  String baseUrl;

  Future<http.Response> get(String path, {Duration timeout = const Duration(seconds: 5)}) {
    return http.get(Uri.parse('$baseUrl$path')).timeout(timeout);
  }

  Future<http.Response> postJson(
    String path,
    Map<String, dynamic> body, {
    Duration timeout = const Duration(seconds: 4),
  }) {
    return http
        .post(
          Uri.parse('$baseUrl$path'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        )
        .timeout(timeout);
  }
}

