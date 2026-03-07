# Flux

Flux is a lightweight helper app for working with AWS Lex V2 bots. It provides a clean UI for managing bots, viewing details, testing flows and creating test sets. 

## Run it

```sh
docker run -p 8000:3000 -d ghcr.io/kaumnen/flux:latest
```

Then open localhost:8000 in your browser. Thats all!

## Capabilities

- Authenticate with AWS credentials and store them locally for the session
- Browse and inspect Lex V2 bots and their details
- View bot configuration and related metadata
- Send messages and see request and response details
- Create test sets, use visualizer to understand the test flow

## Screenshots

<details> 
  <summary>Home Page</summary>
  <img width="6012" height="3130" alt="CleanShot 2026-01-19 at 10 40 53@2x" src="https://github.com/user-attachments/assets/677f4ec5-bfa5-4937-a03d-7ae1f412db0d" />
</details>

<details>
  <summary>Bot Chat & Debug</summary>
  <img width="6006" height="3124" alt="CleanShot 2026-01-19 at 10 44 02@2x" src="https://github.com/user-attachments/assets/60dfe855-dc97-4e5e-bab5-073c5e0142e9" />
</details>

<details>
  <summary>Test Set builder</summary>
  <img width="6010" height="3132" alt="CleanShot 2026-01-19 at 10 46 27@2x" src="https://github.com/user-attachments/assets/49a05674-2b28-4a5a-96ef-0bab6858d9be" />
</details>

## License
MIT
