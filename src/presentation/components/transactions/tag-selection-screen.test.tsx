import React from 'react';
import { TextInput, View as mockSafeAreaView } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { createTag } from '@/domain/entities/tag';

import { TagSelectionScreen } from './tag-selection-screen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: mockSafeAreaView,
}));

jest.mock('@/presentation/localization/localization-provider', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, values?: { count?: number; name?: string }) =>
      values?.count !== undefined
        ? `${key}:${values.count}`
        : values?.name
          ? `${key}:${values.name}`
          : key,
  }),
}));

const timestamp = '2026-10-16T10:00:00.000Z';
const tags = [
  createTag({
    id: 'tag-1',
    name: 'Travel',
    createdAt: timestamp,
    updatedAt: timestamp,
  }),
  createTag({
    id: 'tag-2',
    name: 'Work',
    createdAt: timestamp,
    updatedAt: timestamp,
  }),
];

describe('TagSelectionScreen', () => {
  it('toggles multiple rows and applies only on Confirm', async () => {
    const onConfirm = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TagSelectionScreen
          onBack={jest.fn()}
          onConfirm={onConfirm}
          recentTags={[tags[0]!]}
          selectedTagIds={[]}
          tags={tags}
        />,
      );
    });

    const checkboxes = renderer.root.findAllByProps({
      accessibilityRole: 'checkbox',
    });
    await act(async () => checkboxes[0]!.props.onPress());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByProps({ accessibilityRole: 'checkbox' })
        .filter(({ props }) => typeof props.onPress === 'function').length,
    ).toBeGreaterThanOrEqual(2);

    const confirm = renderer.root.findByProps({ accessibilityRole: 'button' });
    await act(async () => confirm.props.onPress());
    expect(onConfirm).toHaveBeenCalledWith({
      tagIds: ['tag-1'],
      newTagNames: [],
    });
    await act(async () => renderer.unmount());
  });

  it('hides Recents while searching and keeps a new tag in the draft', async () => {
    const onConfirm = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TagSelectionScreen
          onBack={jest.fn()}
          onConfirm={onConfirm}
          recentTags={[tags[0]!]}
          selectedTagIds={[]}
          tags={tags}
        />,
      );
    });
    const input = renderer.root.findByType(TextInput);
    await act(async () => input.props.onChangeText('Personal'));
    expect(renderer.root.findAllByProps({ children: 'tags.recent' })).toEqual(
      [],
    );
    await act(async () =>
      renderer.root.findByType(TextInput).props.onSubmitEditing(),
    );
    const confirm = renderer.root
      .findAllByProps({ accessibilityRole: 'button' })
      .find(({ props }) => typeof props.onPress === 'function');
    await act(async () => confirm!.props.onPress());
    expect(onConfirm).toHaveBeenCalledWith({
      tagIds: [],
      newTagNames: ['Personal'],
    });
    await act(async () => renderer.unmount());
  });

  it('clears the complete selection without committing before Confirm', async () => {
    const onConfirm = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <TagSelectionScreen
          onBack={jest.fn()}
          onConfirm={onConfirm}
          recentTags={tags}
          selectedTagIds={tags.map(({ id }) => id)}
          tags={tags}
        />,
      );
    });
    const clear = renderer.root
      .findAllByProps({ accessibilityLabel: 'tags.clearAll' })
      .find(({ props }) => typeof props.onPress === 'function');
    await act(async () => clear!.props.onPress());
    expect(onConfirm).not.toHaveBeenCalled();
    const confirm = renderer.root
      .findAllByProps({ accessibilityRole: 'button' })
      .find(({ props }) => typeof props.onPress === 'function');
    await act(async () => confirm!.props.onPress());
    expect(onConfirm).toHaveBeenCalledWith({ tagIds: [], newTagNames: [] });
    await act(async () => renderer.unmount());
  });
});
