# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('src/services/ai-enhancement-service.ts')
text = path.read_text()
old = "    } catch (error) {\r\n      if (error instanceof TimeoutError) {\r\n        issues.push(`Chunk ${index + 1}: timed out after ${timeoutMs}ms`);\r\n      } else {\r\n        issues.push(`Chunk ${index + 1}: ${(error as Error).message ?? 'vision error'}`);\r\n      }\r\n    }"
new = "    } catch (error) {\r\n      if (error instanceof TimeoutError) {\r\n        issues.push(`Chunk ${index + 1}: timed out after ${timeoutMs}ms`);\r\n        logger.warn('Gemini vision chunk timed out', { chunkIndex: index + 1, timeoutMs });\r\n      } else {\r\n        const message = (error as Error).message ?? 'vision error';\r\n        issues.push(`Chunk ${index + 1}: ${message}`);\r\n        logger.warn('Gemini vision chunk failed', { chunkIndex: index + 1, error: message });\r\n      }\r\n    }"
if old not in text:
    raise SystemExit('catch block snippet not found')
path.write_text(text.replace(old, new))
