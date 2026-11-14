import 'package:flutter/material.dart';

/// Logo vectoriel StudyFlow (badge dégradé avec courbe de flux et étincelle).
class StudyFlowLogo extends StatelessWidget {
  const StudyFlowLogo({super.key, this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF4F46E5), Color(0xFF9333EA)],
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withValues(alpha: 0.32),
            blurRadius: size * 0.28,
            offset: Offset(0, size * 0.08),
          ),
        ],
      ),
      child: CustomPaint(
        painter: _StudyFlowLogoPainter(),
      ),
    );
  }
}

class _StudyFlowLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final strokePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.11
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    // Courbe en "S" symbolisant le flux de travail
    final flowPath = Path()
      ..moveTo(w * 0.68, h * 0.28)
      ..cubicTo(w * 0.36, h * 0.22, w * 0.28, h * 0.44, w * 0.50, h * 0.50)
      ..cubicTo(w * 0.72, h * 0.56, w * 0.64, h * 0.78, w * 0.32, h * 0.72);
    canvas.drawPath(flowPath, strokePaint);

    // Point d'accentuation (objectif / validation)
    final dotPaint = Paint()..color = const Color(0xFF5EEAD4);
    canvas.drawCircle(Offset(w * 0.72, h * 0.28), w * 0.075, dotPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
