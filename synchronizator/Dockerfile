FROM python:3.13-alpine

WORKDIR /app

COPY . .
RUN pip install -r requirements.txt
ENV PRODUCTION=true
CMD ["python", "main.py"]
