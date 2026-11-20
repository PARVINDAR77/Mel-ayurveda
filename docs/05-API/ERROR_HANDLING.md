# Error Handling Architecture

## 1. Global Exception Filter
All exceptions thrown across controllers, services, or database layers are captured by a centralized `AllExceptionsFilter`:

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const traceId = randomUUID();
    
    // Log exception details securely without logging sensitive credentials
    logger.error({ traceId, status, path: request.url, error: exception });

    response.status(status).json({
      success: false,
      error: {
        code: HttpStatus[status],
        message: exception instanceof HttpException ? exception.message : 'Internal server error',
        traceId,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
```
