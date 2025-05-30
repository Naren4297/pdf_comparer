"""
PDF Comparison Flask Application

This application allows users to upload two PDF files, compare them using the `pdf-diff` tool,
and view or download the generated difference PDF. It also optionally provides a JSON output
containing detailed differences extracted by the `pdf-diff` utility.

Routes:
    - `/`               : Render the homepage.
    - `/compare`        : Handle PDF uploads and perform comparison.
    - `/download/<filename>` : Serve the diff PDF file for download.

Requirements:
    - pdf-diff installed and available in system PATH.
    - A logging configuration defined in `logging_config.py`.

Author: Lakshmi Narayanan
Email: lakshmi01.t@zifocorp.com
Date: 20-May-2025
"""

import os
import json
import logging
import subprocess
from flask import Flask, request, send_file, render_template, jsonify
from werkzeug.utils import secure_filename

from logging_config import setup_logging

# Setup centralized logging
setup_logging()
logger = logging.getLogger(__name__)

# Flask application configuration
app = Flask(__name__)
app.secret_key = "your_secret_key"  # TODO: Replace with environment variable in production

UPLOAD_FOLDER = os.path.join('static', 'output')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/')
def index():
    """
    Render the homepage.

    Returns:
        HTML: Rendered index.html page.
    """
    logger.info("Accessed index page")
    return render_template('index.html')


@app.route('/compare', methods=['POST'])
def compare_files():
    """
    Handle file upload, run `pdf-diff`, and return the comparison results.

    Returns:
        JSON: Response containing success status, output PDF filename,
              and parsed JSON differences (if available).
    """
    file1 = request.files.get('file1')
    file2 = request.files.get('file2')

    if not file1 or not file2:
        logger.warning("Missing one or both uploaded files")
        return jsonify({'success': False, 'message': 'Both files are required!'}), 400

    filename1 = secure_filename(file1.filename)
    filename2 = secure_filename(file2.filename)

    path1 = os.path.abspath(os.path.join(app.root_path, app.config['UPLOAD_FOLDER'], filename1))
    path2 = os.path.abspath(os.path.join(app.root_path, app.config['UPLOAD_FOLDER'], filename2))

    logger.info(f"Saving files: {filename1}, {filename2}")
    file1.save(path1)
    file2.save(path2)

    output_filename = f"{filename1.rsplit('.', 1)[0]}_{filename2.rsplit('.', 1)[0]}_diff.pdf"
    output_path = os.path.abspath(os.path.join(app.root_path, app.config['UPLOAD_FOLDER'], output_filename))

    logger.info(f"Generating diff PDF: {output_filename}")

    command = [
        "pdf-diff",
        path1,
        path2,
        "--output",
        output_path
    ]

    try:
        subprocess.run(command, check=True)
        logger.info("PDF comparison completed")

        json_path = os.path.splitext(output_path)[0] + ".json"
        differences = {}

        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                differences = json.load(f)

        return jsonify({
            'success': True,
            'filename': output_filename,
            'differences': differences
        })

    except subprocess.CalledProcessError as error:
        logger.error(f"Comparison command failed: {error}")
        return jsonify({'success': False, 'message': 'PDF comparison failed.'}), 500


@app.route('/download/<filename>')
def download_file(filename):
    """
    Allow users to download the generated diff PDF file.

    Args:
        filename (str): Name of the file to be downloaded.

    Returns:
        File: The PDF file as an attachment, or 404 error if not found.
    """
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    if os.path.exists(file_path):
        logger.info(f"Download initiated for file: {filename}")
        return send_file(file_path, as_attachment=True, download_name=filename, mimetype='application/pdf')

    logger.warning(f"File not found: {filename}")
    return "File not found", 404


def main():
    """
    Entry point to start the Flask application.
    """
    logger.info("Starting Flask app...")
    app.run(host='0.0.0.0', port=5006, debug=True)


if __name__ == "__main__":
    main()
