# Dockerfile

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install required packages
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libxml2-dev \
    libxslt1-dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY . .

# Clone and build the pdf-diff-utility repository
WORKDIR /app/pdf-diff-primary

RUN  python3 setup.py install

WORKDIR /app
RUN pip install -r requirements.txt
RUN pip list
# Expose the Flask port
EXPOSE 5001

# Run the Flask app
CMD ["python", "app.py"]