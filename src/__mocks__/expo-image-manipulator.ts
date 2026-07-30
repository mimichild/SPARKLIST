export const SaveFormat = { JPEG: 'jpeg', PNG: 'png' };

export const manipulateAsync = jest.fn().mockImplementation(async (uri: string, actions: unknown[] = []) => {
  const cropAction = (actions as Array<{ crop?: { width: number; height: number } }>).find((a) => a.crop);
  return {
    uri: `mock://cropped-${Date.now()}.jpg`,
    width: cropAction?.crop?.width ?? 100,
    height: cropAction?.crop?.height ?? 100,
  };
});
