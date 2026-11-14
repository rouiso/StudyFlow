import 'package:flutter/material.dart';
import '../../core/models/studyflow_models.dart';
import '../../core/services/prisma_api_service.dart';
import '../../state/studyflow_store.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.store});
  final StudyFlowStore store;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isRegisterMode = false;
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController(text: 'password123');
  late final TextEditingController _urlCtrl;
  bool _showServerConfig = false;

  @override
  void initState() {
    super.initState();
    _urlCtrl = TextEditingController(text: widget.store.serverUrl);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    widget.store.updateServerUrl(_urlCtrl.text);
    if (_isRegisterMode) {
      await widget.store.register(_nameCtrl.text, _emailCtrl.text, _passCtrl.text);
    } else {
      await widget.store.login(_emailCtrl.text, _passCtrl.text);
    }
  }

  Future<void> _quickLogin(AppUser demoUser) async {
    widget.store.updateServerUrl(_urlCtrl.text);
    _emailCtrl.text = demoUser.email;
    await widget.store.login(demoUser.email, 'password123');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo & Titre
                  Center(
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF4F46E5), Color(0xFF9333EA)],
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF4F46E5).withValues(alpha: 0.35),
                            blurRadius: 18,
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: const Text(
                        'SF',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 22,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    _isRegisterMode ? 'Créer un compte StudyFlow' : 'Connexion à StudyFlow',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Gestion de projets, tâches et coaching collaboratif',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                  const SizedBox(height: 20),

                  // Connexion rapide par profil
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'ACCÈS RAPIDE',
                        style: TextStyle(
                          color: Color(0xFF818CF8),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.7,
                        ),
                      ),
                      Text(
                        'Profils de l\'équipe',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.4,
                    children: StudyFlowSeedData.users.map((u) {
                      final isCoach = u.isCoach;
                      return InkWell(
                        onTap: widget.store.isLoading ? null : () => _quickLogin(u),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: isCoach
                                ? const Color(0xFF3B0764).withValues(alpha: 0.5)
                                : const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isCoach
                                  ? const Color(0xFFA855F7).withValues(alpha: 0.5)
                                  : const Color(0xFF334155),
                            ),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 15,
                                backgroundColor: const Color(0xFF4F46E5),
                                child: Text(
                                  u.name.substring(0, 1),
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      u.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      roleToString(u.role),
                                      style: TextStyle(
                                        color: isCoach ? const Color(0xFFD8B4FE) : const Color(0xFF94A3B8),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 18),

                  // Formulaire Email / Mot de passe
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (widget.store.statusMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(10),
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF881337).withValues(alpha: 0.4),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFF43F5E).withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              widget.store.statusMessage!,
                              style: const TextStyle(color: Color(0xFFFDA4AF), fontSize: 12),
                            ),
                          ),
                        ],
                        if (_isRegisterMode) ...[
                          TextField(
                            controller: _nameCtrl,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                            decoration: _inputDeco('Nom complet', Icons.person_outline),
                          ),
                          const SizedBox(height: 12),
                        ],
                        TextField(
                          controller: _emailCtrl,
                          keyboardType: TextInputType.emailAddress,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: _inputDeco('Adresse e-mail', Icons.mail_outline),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _passCtrl,
                          obscureText: true,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: _inputDeco('Mot de passe', Icons.lock_outline),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: widget.store.isLoading ? null : _submit,
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF4F46E5),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: widget.store.isLoading
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : Text(
                                  _isRegisterMode ? 'Créer mon compte' : 'Se connecter',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                        ),
                        const SizedBox(height: 10),
                        TextButton(
                          onPressed: () => setState(() => _isRegisterMode = !_isRegisterMode),
                          child: Text(
                            _isRegisterMode
                                ? 'Déjà inscrit ? Se connecter'
                                : 'Nouveau sur StudyFlow ? Créer un compte',
                            style: const TextStyle(color: Color(0xFF818CF8), fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: () => setState(() => _showServerConfig = !_showServerConfig),
                    icon: const Icon(Icons.tune, size: 16, color: Color(0xFF64748B)),
                    label: const Text(
                      'Paramètres de connexion',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                    ),
                  ),
                  if (_showServerConfig)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: TextField(
                        controller: _urlCtrl,
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                        decoration: _inputDeco('Adresse du service', Icons.link),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDeco(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
      prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 18),
      filled: true,
      fillColor: const Color(0xFF1E293B),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF334155)),
      ),
    );
  }
}

